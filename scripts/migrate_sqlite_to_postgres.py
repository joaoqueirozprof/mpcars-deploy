#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to PostgreSQL for MPCARS project.
Handles all 26 tables with proper dependency ordering and data type conversion.
"""

import sqlite3
import psycopg2
from psycopg2.extras import execute_batch
import argparse
import sys
from typing import List, Tuple, Any, Dict
from datetime import datetime


class SQLiteToPostgresMigrator:
    """Handles migration of data from SQLite to PostgreSQL."""

    # Table dependency order - tables with foreign keys should come after their dependencies
    TABLE_ORDER = [
        'empresas',
        'clientes',
        'veiculos',
        'contratos',
        'quilometragem',
        'despesas_contrato',
        'prorrogacoes_contrato',
        'despesas_veiculos',
        'despesas_loja',
        'configuracoes',
        'ipva_aliquotas',
        'ipva_registros',
        'documentos',
        'seguros',
        'parcelas_seguro',
        'uso_veiculo_empresa',
        'relatorios_nf',
        'despesas_nf',
        'alertas_historico',
        'motoristas_empresa',
        'despesas_operacionais',
        'audit_log',
        'reservas',
        'checkin_checkout',
        'multas',
        'manutencoes',
    ]

    # Tables with boolean columns (SQLite stores as 0/1, convert to boolean)
    BOOLEAN_COLUMNS = {
        'veiculos': ['checklist_padrao', 'ativo'],
        'contratos': ['ativo', 'finalizado'],
        'despesas_contrato': [],
        'configuracoes': [],
    }

    def __init__(self, sqlite_path: str, postgres_url: str):
        """Initialize migrator with database connection strings."""
        self.sqlite_path = sqlite_path
        self.postgres_url = postgres_url
        self.sqlite_conn = None
        self.postgres_conn = None
        self.migration_stats = {}

    def connect_databases(self):
        """Establish connections to both databases."""
        try:
            self.sqlite_conn = sqlite3.connect(self.sqlite_path)
            self.sqlite_conn.row_factory = sqlite3.Row
            print(f"Connected to SQLite: {self.sqlite_path}")
        except Exception as e:
            print(f"Error connecting to SQLite: {e}")
            sys.exit(1)

        try:
            self.postgres_conn = psycopg2.connect(self.postgres_url)
            self.postgres_conn.autocommit = False
            print(f"Connected to PostgreSQL")
        except Exception as e:
            print(f"Error connecting to PostgreSQL: {e}")
            sys.exit(1)

    def close_databases(self):
        """Close both database connections."""
        if self.sqlite_conn:
            self.sqlite_conn.close()
        if self.postgres_conn:
            self.postgres_conn.close()

    def get_table_columns(self, table_name: str, cursor) -> List[str]:
        """Get column names for a table from SQLite."""
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [row[1] for row in cursor.fetchall()]
        return columns

    def read_sqlite_table(self, table_name: str) -> Tuple[List[str], List[Tuple]]:
        """Read all rows from a SQLite table."""
        cursor = self.sqlite_conn.cursor()
        try:
            # Get column names
            columns = self.get_table_columns(table_name, cursor)

            # Read all data
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()

            # Convert Row objects to tuples
            data = [tuple(row) for row in rows]

            return columns, data
        except Exception as e:
            print(f"Error reading {table_name}: {e}")
            return [], []
        finally:
            cursor.close()

    def convert_value(self, value: Any, column_name: str, table_name: str) -> Any:
        """Convert SQLite values to PostgreSQL compatible values."""
        if value is None:
            return None

        # Convert 0/1 to boolean for known boolean columns
        if (table_name in self.BOOLEAN_COLUMNS and
            column_name in self.BOOLEAN_COLUMNS[table_name] and
            isinstance(value, int)):
            return bool(value)

        return value

    def convert_row_data(self, table_name: str, columns: List[str], row: Tuple) -> Tuple:
        """Convert all values in a row for PostgreSQL compatibility."""
        converted = []
        for i, value in enumerate(row):
            col_name = columns[i]
            converted_value = self.convert_value(value, col_name, table_name)
            converted.append(converted_value)
        return tuple(converted)

    def insert_into_postgres(self, table_name: str, columns: List[str], rows: List[Tuple]):
        """Insert rows into PostgreSQL table with batch operations."""
        if not rows:
            self.migration_stats[table_name] = 0
            return

        cursor = self.postgres_conn.cursor()
        try:
            # Convert all rows for PostgreSQL
            converted_rows = [
                self.convert_row_data(table_name, columns, row)
                for row in rows
            ]

            # Build INSERT statement
            placeholders = ','.join(['%s'] * len(columns))
            column_list = ','.join(columns)
            sql = f"INSERT INTO {table_name} ({column_list}) VALUES ({placeholders})"

            # Execute batch insert
            execute_batch(cursor, sql, converted_rows, page_size=100)
            self.postgres_conn.commit()

            self.migration_stats[table_name] = len(converted_rows)
            print(f"✓ {table_name}: {len(converted_rows)} records inserted")

        except Exception as e:
            self.postgres_conn.rollback()
            print(f"✗ Error inserting into {table_name}: {e}")
            self.migration_stats[table_name] = 0
        finally:
            cursor.close()

    def reset_postgres_sequences(self):
        """Reset all sequences in PostgreSQL to continue auto-increment correctly."""
        cursor = self.postgres_conn.cursor()
        try:
            # Get all sequences from information_schema
            cursor.execute("""
                SELECT sequence_schema, sequence_name
                FROM information_schema.sequences
                WHERE sequence_schema = 'public'
            """)
            sequences = cursor.fetchall()

            for schema, seq_name in sequences:
                try:
                    # Get the table and column this sequence is associated with
                    cursor.execute(f"""
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = %s AND column_default LIKE %s
                    """, (schema, f"nextval('{seq_name}'%"))

                    col_info = cursor.fetchone()
                    if col_info:
                        col_name = col_info[0]
                        # Find the table and reset the sequence
                        cursor.execute(f"""
                            SELECT MAX(CAST({col_name} AS INTEGER))
                            FROM information_schema.columns c
                            WHERE c.column_default LIKE %s
                        """, (f"nextval('{seq_name}'%",))
                except:
                    pass

            # Alternative simpler approach: reset known sequences
            for table_name in self.TABLE_ORDER:
                try:
                    cursor.execute(f"""
                        SELECT setval('{table_name}_id_seq',
                                     (SELECT COALESCE(MAX(id), 0) FROM {table_name}) + 1)
                    """)
                except:
                    # Sequence might not exist, that's ok
                    pass

            self.postgres_conn.commit()
            print("✓ PostgreSQL sequences reset")

        except Exception as e:
            self.postgres_conn.rollback()
            print(f"Warning: Could not reset sequences: {e}")
        finally:
            cursor.close()

    def migrate(self):
        """Execute the full migration process."""
        print("=" * 60)
        print("MPCARS: SQLite to PostgreSQL Migration")
        print("=" * 60)
        print()

        self.connect_databases()

        print(f"Starting migration of {len(self.TABLE_ORDER)} tables...")
        print()

        start_time = datetime.now()

        # Disable foreign key checks during migration
        pg_cursor = self.postgres_conn.cursor()
        try:
            pg_cursor.execute("SET session_replication_role = 'replica'")
            self.postgres_conn.commit()
        except:
            pass
        finally:
            pg_cursor.close()

        # Migrate each table in order
        for table_name in self.TABLE_ORDER:
            print(f"Migrating {table_name}...", end=" ")
            columns, rows = self.read_sqlite_table(table_name)

            if not columns:
                print(f"✗ Table not found or error reading")
                self.migration_stats[table_name] = 0
                continue

            self.insert_into_postgres(table_name, columns, rows)

        # Re-enable foreign key checks
        pg_cursor = self.postgres_conn.cursor()
        try:
            pg_cursor.execute("SET session_replication_role = 'origin'")
            self.postgres_conn.commit()
        except:
            pass
        finally:
            pg_cursor.close()

        # Reset sequences
        print()
        self.reset_postgres_sequences()

        # Print summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print()
        print("=" * 60)
        print("Migration Summary")
        print("=" * 60)

        total_records = sum(self.migration_stats.values())

        for table_name in self.TABLE_ORDER:
            count = self.migration_stats.get(table_name, 0)
            status = "✓" if count > 0 else "✗"
            print(f"{status} {table_name:30} {count:6} records")

        print("-" * 60)
        print(f"Total records migrated: {total_records}")
        print(f"Duration: {duration:.2f} seconds")
        print("=" * 60)

        self.close_databases()

        return total_records > 0


def main():
    """Parse arguments and run migration."""
    parser = argparse.ArgumentParser(
        description='Migrate MPCARS data from SQLite to PostgreSQL'
    )
    parser.add_argument(
        '--sqlite-path',
        default='./dados/mpcars.db',
        help='Path to SQLite database file (default: ./dados/mpcars.db)'
    )
    parser.add_argument(
        '--postgres-url',
        default='postgresql://mpcars:mpcars@localhost:5432/mpcars',
        help='PostgreSQL connection URL (default: postgresql://mpcars:mpcars@localhost:5432/mpcars)'
    )

    args = parser.parse_args()

    migrator = SQLiteToPostgresMigrator(args.sqlite_path, args.postgres_url)
    success = migrator.migrate()

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
