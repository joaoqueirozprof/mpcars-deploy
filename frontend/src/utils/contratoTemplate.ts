/**
 * Generates the rental contract HTML matching the exact MPCARS PDF format.
 * Opens in a new window for printing.
 */

function fmt(val: any, decimals = 2): string {
  const n = parseFloat(val) || 0
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return '____/____/________'
  try {
    const d = new Date(val + 'T00:00:00')
    return d.toLocaleDateString('pt-BR')
  } catch { return val }
}

function fmtTime(val: string | null | undefined): string {
  if (!val) return '____:____'
  return val.substring(0, 5)
}

export function gerarContratoHTML(contrato: any): string {
  const c = contrato
  const cl = c.cliente || {}
  const v = c.veiculo || {}

  const endereco = [cl.endereco_residencial, cl.numero_residencial].filter(Boolean).join(', ')
  const bairro = cl.bairro_residencial || ''
  const cidadeEstado = [cl.cidade, cl.estado].filter(Boolean).join(' - ')
  const kmLivresTotal = (parseFloat(c.km_livres_dia) || 0) * (parseInt(c.quantidade_diarias) || 1)
  const subtotal = (parseInt(c.quantidade_diarias) || 1) * (parseFloat(c.valor_diaria) || 0)

  // Fuel gauge position
  const fuelMap: Record<string, number> = { 'Reserva': 0, '1/4': 1, '1/2': 2, '3/4': 3, '1/1': 4 }
  const fuelLevel = fuelMap[c.combustivel_saida] ?? 4

  // Checklist from vehicle
  const checkItems = [
    { label: 'Macaco', checked: v.macaco },
    { label: 'Estepe', checked: v.estepe },
    { label: 'Ferram.', checked: v.ferram },
    { label: 'Triângulo', checked: v.triangulo },
    { label: 'Documento', checked: v.documento },
    { label: 'Extintor', checked: v.extintor },
    { label: 'Calotas', checked: v.calotas },
    { label: 'Tapetes', checked: v.tapetes },
    { label: 'CD Player', checked: v.cd_player },
  ]

  const now = new Date()
  const timestamp = `Contrato gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Contrato de Locação #${c.id} - MPCARS</title>
<style>
  @page { size: A4; margin: 10mm 12mm; }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 8mm 10mm; }
  .page2 { page-break-before: always; }

  /* Header */
  .header { text-align: center; border: 2px solid #000; padding: 8px; margin-bottom: 6px; }
  .header h1 { font-size: 22pt; font-weight: bold; letter-spacing: 3px; margin-bottom: 2px; }
  .header .subtitle { font-size: 8pt; margin-bottom: 2px; }

  /* Sections */
  .section { border: 1px solid #000; margin-bottom: 4px; }
  .section-title { background: #333; color: #fff; font-weight: bold; font-size: 8pt; padding: 3px 6px; text-transform: uppercase; letter-spacing: 1px; }
  .section-body { padding: 4px 6px; }
  .row { display: flex; gap: 6px; margin-bottom: 2px; }
  .field { flex: 1; }
  .field label { font-weight: bold; font-size: 7.5pt; }
  .field span { font-size: 9pt; }
  .field-border { border-bottom: 1px solid #999; min-height: 14px; padding: 1px 4px; }

  /* Table */
  table.pricing { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  table.pricing th, table.pricing td { border: 1px solid #000; padding: 3px 6px; text-align: center; }
  table.pricing th { background: #ddd; font-weight: bold; }
  table.pricing .right { text-align: right; }
  table.pricing .bold { font-weight: bold; }

  /* Fuel gauge */
  .fuel-gauge { display: flex; align-items: center; gap: 4px; margin: 4px 0; }
  .fuel-bar { display: flex; gap: 2px; }
  .fuel-segment { width: 20px; height: 14px; border: 1px solid #000; }
  .fuel-filled { background: #333; }
  .fuel-label { font-size: 7pt; font-weight: bold; }

  /* Checklist */
  .checklist { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 4px 0; }
  .check-item { font-size: 8pt; display: flex; align-items: center; gap: 3px; }
  .checkbox { width: 12px; height: 12px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 9pt; font-weight: bold; }

  /* Car diagram */
  .car-diagram { border: 1px solid #999; width: 180px; height: 80px; margin: 6px auto; position: relative; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 7pt; color: #999; }

  /* Signatures */
  .signatures { display: flex; justify-content: space-between; margin-top: 20px; gap: 20px; }
  .sig-block { flex: 1; text-align: center; }
  .sig-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 4px; font-size: 8pt; }

  /* Clauses */
  .clauses { font-size: 7.5pt; line-height: 1.4; }
  .clause { margin-bottom: 4px; text-align: justify; }
  .clause strong { font-size: 7.5pt; }

  /* Print button */
  .print-btn { position: fixed; top: 10px; right: 10px; z-index: 1000; background: #2563eb; color: #fff; border: none; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
  .print-btn:hover { background: #1d4ed8; }

  .vistoria-grid { display: flex; gap: 8px; align-items: flex-start; }
  .vistoria-left { flex: 1; }
  .vistoria-right { flex: 0 0 200px; }

  .legal-text { font-size: 7pt; text-align: justify; line-height: 1.3; margin-top: 4px; padding: 3px 6px; border: 1px solid #000; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">Imprimir Contrato</button>

<!-- ========== PÁGINA 1 ========== -->
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <h1>MPCARS</h1>
    <div class="subtitle">CNPJ: 32.471.526/0001-53 &nbsp; | &nbsp; &#9742; 84 99911-0504</div>
    <div class="subtitle">Locação de Veículos</div>
  </div>

  <!-- LOCATÁRIO -->
  <div class="section">
    <div class="section-title">Locatário</div>
    <div class="section-body">
      <div class="row">
        <div class="field" style="flex:3"><label>Nome: </label><span>${cl.nome || ''}</span></div>
      </div>
      <div class="row">
        <div class="field" style="flex:3"><label>Endereço: </label><span>${endereco} ${bairro ? '- ' + bairro : ''}</span></div>
      </div>
      <div class="row">
        <div class="field" style="flex:2"><label>Cidade: </label><span>${cidadeEstado}</span></div>
        <div class="field"><label>CEP: </label><span>${cl.cep_residencial || ''}</span></div>
      </div>
      <div class="row">
        <div class="field"><label>Telefone: </label><span>${cl.telefone || ''} ${cl.telefone2 ? ' / ' + cl.telefone2 : ''}</span></div>
        <div class="field"><label>Email: </label><span>${cl.email || ''}</span></div>
      </div>
    </div>
  </div>

  <!-- IDENTIFICAÇÃO -->
  <div class="section">
    <div class="section-title">Identificação</div>
    <div class="section-body">
      <div class="row">
        <div class="field"><label>CPF/CNPJ: </label><span>${cl.cpf_cnpj || ''}</span></div>
        <div class="field"><label>CNH: </label><span>${cl.cnh || ''}</span></div>
        <div class="field"><label>Categoria: </label><span>${cl.cnh_categoria || ''}</span></div>
      </div>
      <div class="row">
        <div class="field"><label>Validade CNH: </label><span>${fmtDate(cl.cnh_validade)}</span></div>
        <div class="field"><label>RG: </label><span>${cl.rg || ''} ${cl.orgao_emissor ? '(' + cl.orgao_emissor + ')' : ''}</span></div>
      </div>
    </div>
  </div>

  <!-- CARRO -->
  <div class="section">
    <div class="section-title">Carro</div>
    <div class="section-body">
      <div class="row">
        <div class="field" style="flex:2"><label>Marca/Tipo: </label><span>${v.marca || ''} ${v.modelo || ''} ${v.ano ? '(' + v.ano + ')' : ''} - ${v.cor || ''}</span></div>
        <div class="field"><label>Placa: </label><span style="font-size:11pt;font-weight:bold">${v.placa || ''}</span></div>
      </div>
    </div>
  </div>

  <!-- QUILOMETRAGEM -->
  <div class="section">
    <div class="section-title">Quilometragem</div>
    <div class="section-body">
      <table class="pricing">
        <tr>
          <th></th>
          <th>Data</th>
          <th>Hora</th>
          <th>KM</th>
        </tr>
        <tr>
          <td class="bold">Saída</td>
          <td>${fmtDate(c.data_saida)}</td>
          <td>${fmtTime(c.hora_saida)}</td>
          <td>${fmt(c.km_saida, 0)}</td>
        </tr>
        <tr>
          <td class="bold">Entrada</td>
          <td>${fmtDate(c.data_entrada)}</td>
          <td>${fmtTime(c.hora_entrada)}</td>
          <td>${c.km_entrada ? fmt(c.km_entrada, 0) : ''}</td>
        </tr>
      </table>
      <div class="row" style="margin-top:4px">
        <div class="field"><label>KM Livres/Dia: </label><span>${fmt(c.km_livres_dia, 0)}</span></div>
        <div class="field"><label>KM Livres Total: </label><span>${fmt(kmLivresTotal, 0)}</span></div>
        <div class="field"><label>KM Percorridos: </label><span>${c.km_percorridos ? fmt(c.km_percorridos, 0) : ''}</span></div>
      </div>
    </div>
  </div>

  <!-- TABELA DE PREÇOS -->
  <div class="section">
    <div class="section-title">Valores</div>
    <div class="section-body">
      <table class="pricing">
        <tr>
          <th>Descrição</th>
          <th>Qtd</th>
          <th>Valor Unit.</th>
          <th>Total</th>
        </tr>
        <tr>
          <td>Diária</td>
          <td>${c.quantidade_diarias || 1}</td>
          <td class="right">R$ ${fmt(c.valor_diaria)}</td>
          <td class="right bold">R$ ${fmt(subtotal)}</td>
        </tr>
        <tr>
          <td>Hora Extra</td>
          <td>${fmt(c.hora_extra || 0, 0)}</td>
          <td class="right">R$ ${fmt(c.valor_hora_extra)}</td>
          <td class="right">R$ ${fmt((parseFloat(c.hora_extra) || 0) * (parseFloat(c.valor_hora_extra) || 0))}</td>
        </tr>
        <tr>
          <td>KM Excedente</td>
          <td>${fmt(c.km_excedente || 0, 0)}</td>
          <td class="right">R$ ${fmt(c.valor_km_excedente)}</td>
          <td class="right">R$ ${fmt((parseFloat(c.km_excedente) || 0) * (parseFloat(c.valor_km_excedente) || 0))}</td>
        </tr>
        <tr style="background:#f0f0f0">
          <td colspan="3" class="bold right">Sub-Total</td>
          <td class="right bold">R$ ${fmt(c.subtotal || subtotal)}</td>
        </tr>
        <tr>
          <td colspan="3" class="right">Avarias</td>
          <td class="right">R$ ${fmt(c.avarias)}</td>
        </tr>
        <tr>
          <td colspan="3" class="right">Desconto</td>
          <td class="right">R$ ${fmt(c.desconto)}</td>
        </tr>
        <tr style="background:#333;color:#fff">
          <td colspan="3" class="bold right" style="color:#fff">TOTAL</td>
          <td class="right bold" style="color:#fff;font-size:11pt">R$ ${fmt(c.total)}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- VISTORIA VEÍCULO -->
  <div class="section">
    <div class="section-title">Vistoria Veículo</div>
    <div class="section-body">
      <div class="vistoria-grid">
        <div class="vistoria-left">
          <!-- Fuel Gauge -->
          <div class="fuel-gauge">
            <span class="fuel-label">RES</span>
            <div class="fuel-bar">
              ${[0,1,2,3,4].map(i => `<div class="fuel-segment ${i <= fuelLevel ? 'fuel-filled' : ''}"></div>`).join('')}
            </div>
            <span class="fuel-label">CHEIO</span>
          </div>

          <!-- Checklist -->
          <div class="checklist">
            ${checkItems.map(item => `
              <div class="check-item">
                <div class="checkbox">${item.checked ? 'X' : ''}</div>
                <span>${item.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="vistoria-right">
          <!-- Car Diagram -->
          <div class="car-diagram">
            <svg viewBox="0 0 200 90" width="180" height="80">
              <rect x="20" y="10" width="160" height="70" rx="20" ry="20" fill="none" stroke="#999" stroke-width="1.5"/>
              <rect x="30" y="20" width="50" height="30" rx="5" fill="none" stroke="#ccc" stroke-width="1"/>
              <rect x="120" y="20" width="50" height="30" rx="5" fill="none" stroke="#ccc" stroke-width="1"/>
              <circle cx="55" cy="82" r="8" fill="none" stroke="#999" stroke-width="1.5"/>
              <circle cx="145" cy="82" r="8" fill="none" stroke="#999" stroke-width="1.5"/>
              <text x="100" y="65" text-anchor="middle" font-size="7" fill="#999">Marcar avarias</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- CARTÕES DE CRÉDITO -->
  <div class="section">
    <div class="section-title">Cartões de Crédito</div>
    <div class="section-body">
      <div class="row">
        <div class="field"><label>Tipo: </label><span>${c.cartao_tipo || ''}</span></div>
        <div class="field"><label>Nº: </label><span>${c.cartao_numero || ''}</span></div>
        <div class="field"><label>Código: </label><span>${c.cartao_codigo || ''}</span></div>
      </div>
      <div class="row">
        <div class="field"><label>Pré-Autorização: </label><span>${c.cartao_preaut || ''}</span></div>
        <div class="field"><label>Validade: </label><span>${c.cartao_validade || ''}</span></div>
        <div class="field"><label>Valor: </label><span>${c.cartao_valor ? 'R$ ' + fmt(c.cartao_valor) : ''}</span></div>
      </div>
    </div>
  </div>

  <!-- TEXTO LEGAL -->
  <div class="legal-text">
    Declaro que recebi o veículo acima descrito em perfeitas condições de uso, conforme vistoria realizada, comprometendo-me a devolvê-lo nas mesmas condições. Estou ciente e de acordo com todas as cláusulas contratuais constantes no verso deste documento. A assinatura deste contrato implica na aceitação integral de todas as condições aqui estabelecidas.
  </div>

  <!-- ASSINATURA CLIENTE -->
  <div style="margin-top:16px">
    <div style="text-align:center">
      <div style="border-top:1px solid #000;display:inline-block;width:300px;margin-top:30px;padding-top:4px;font-size:8pt">
        <strong>Assinatura do Cliente / Locatário</strong>
      </div>
    </div>
  </div>

</div>

<!-- ========== PÁGINA 2 - CLÁUSULAS ========== -->
<div class="page page2">

  <div class="header" style="margin-bottom:10px">
    <h1>MPCARS</h1>
    <div class="subtitle">Contrato de Locação de Veículo - Termos e Condições</div>
  </div>

  <div class="clauses">
    <div class="clause"><strong>CLÁUSULA 1ª -</strong> O LOCATÁRIO declara ter recebido o veículo em perfeitas condições de funcionamento e conservação, obrigando-se a devolvê-lo no mesmo estado, ressalvado o desgaste natural pelo uso normal.</div>
    <div class="clause"><strong>CLÁUSULA 2ª -</strong> O veículo locado destina-se exclusivamente ao uso do LOCATÁRIO, sendo vedada a sublocação, empréstimo ou cessão a terceiros sem autorização expressa da LOCADORA.</div>
    <div class="clause"><strong>CLÁUSULA 3ª -</strong> O LOCATÁRIO se compromete a utilizar o veículo em vias públicas pavimentadas, sendo expressamente proibido o uso em estradas de terra, competições, testes ou qualquer finalidade que não seja o transporte normal de pessoas.</div>
    <div class="clause"><strong>CLÁUSULA 4ª -</strong> Todas as multas de trânsito, pedágios e despesas decorrentes do uso do veículo durante o período de locação são de inteira responsabilidade do LOCATÁRIO.</div>
    <div class="clause"><strong>CLÁUSULA 5ª -</strong> Em caso de sinistro (acidente, roubo, furto), o LOCATÁRIO deverá comunicar imediatamente a LOCADORA e registrar Boletim de Ocorrência na delegacia mais próxima, ficando responsável pela franquia do seguro.</div>
    <div class="clause"><strong>CLÁUSULA 6ª -</strong> O LOCATÁRIO é responsável por manter o nível de combustível, água, óleo e verificar a calibragem dos pneus durante todo o período de locação.</div>
    <div class="clause"><strong>CLÁUSULA 7ª -</strong> A devolução do veículo deverá ser feita na data e hora acordadas. O atraso na devolução acarretará cobrança de hora extra conforme tabela vigente, sem prejuízo de outras penalidades contratuais.</div>
    <div class="clause"><strong>CLÁUSULA 8ª -</strong> O LOCATÁRIO autoriza a LOCADORA a debitar em seu cartão de crédito os valores referentes a multas, avarias, combustível, horas extras e quilometragem excedente verificados na devolução do veículo.</div>
    <div class="clause"><strong>CLÁUSULA 9ª -</strong> É expressamente proibido fumar no interior do veículo locado. O descumprimento desta cláusula acarretará multa de higienização conforme tabela vigente.</div>
    <div class="clause"><strong>CLÁUSULA 10ª -</strong> O veículo possui quilometragem livre diária conforme especificado na primeira página. O excedente será cobrado por quilômetro rodado conforme valor estipulado.</div>
    <div class="clause"><strong>CLÁUSULA 11ª -</strong> A LOCADORA não se responsabiliza por objetos pessoais deixados no interior do veículo, seja durante o período de locação ou após a devolução.</div>
    <div class="clause"><strong>CLÁUSULA 12ª -</strong> O LOCATÁRIO deverá devolver o veículo com o mesmo nível de combustível registrado na saída. Caso contrário, será cobrado o valor do combustível faltante acrescido de taxa de serviço.</div>
    <div class="clause"><strong>CLÁUSULA 13ª -</strong> Qualquer avaria no veículo não registrada na vistoria de saída será de responsabilidade do LOCATÁRIO, que autoriza desde já o débito do valor correspondente ao reparo.</div>
    <div class="clause"><strong>CLÁUSULA 14ª -</strong> O presente contrato é regido pelas leis brasileiras. As partes elegem o foro da Comarca de Natal/RN para dirimir quaisquer dúvidas ou litígios decorrentes deste instrumento.</div>
    <div class="clause"><strong>CLÁUSULA 15ª -</strong> O LOCATÁRIO declara que leu, compreendeu e está de acordo com todas as cláusulas deste contrato, assinando-o em duas vias de igual teor e forma.</div>
  </div>

  <!-- ASSINATURAS -->
  <div class="signatures" style="margin-top:30px">
    <div class="sig-block">
      <div class="sig-line"><strong>LOCATÁRIO</strong><br>${cl.nome || ''}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"><strong>LOCADORA</strong><br>MPCARS</div>
    </div>
  </div>
  <div class="signatures" style="margin-top:10px">
    <div class="sig-block">
      <div class="sig-line"><strong>TESTEMUNHA 1</strong><br>Nome: ________________________</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"><strong>TESTEMUNHA 2</strong><br>Nome: ________________________</div>
    </div>
  </div>

  <div style="text-align:center;margin-top:20px;font-size:7pt;color:#999">
    ${timestamp} | Contrato #${c.id}
  </div>

</div>

</body>
</html>`
}
