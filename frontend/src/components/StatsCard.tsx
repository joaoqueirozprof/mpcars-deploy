import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string | number
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  color = 'primary',
}) => {
  const colorClasses = {
    primary: {
      bg: 'bg-primary-50',
      icon: 'bg-primary-100 text-primary-600',
      trend: 'text-primary-600 bg-primary-50',
    },
    success: {
      bg: 'bg-success-50',
      icon: 'bg-success-100 text-success-600',
      trend: 'text-success-600 bg-success-50',
    },
    warning: {
      bg: 'bg-warning-50',
      icon: 'bg-warning-100 text-warning-600',
      trend: 'text-warning-600 bg-warning-50',
    },
    danger: {
      bg: 'bg-danger-50',
      icon: 'bg-danger-100 text-danger-600',
      trend: 'text-danger-600 bg-danger-50',
    },
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} />
      case 'down':
        return <TrendingDown size={16} />
      default:
        return <Minus size={16} />
    }
  }

  const colors = colorClasses[color]

  return (
    <div className={`${colors.bg} rounded-xl p-6 card hover:shadow-card-hover transition-all duration-300`}>
      {/* Header with icon */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-neutral-600 text-sm font-medium mb-2">{title}</p>
          <p className="text-3xl font-bold text-neutral-900">{value}</p>
        </div>
        <div className={`${colors.icon} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>

      {/* Trend indicator */}
      {trend && trendValue !== undefined && (
        <div className="flex items-center gap-2">
          <div className={`${colors.trend} px-2.5 py-1.5 rounded-lg flex items-center gap-1`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">{trendValue}</span>
          </div>
          <span className="text-neutral-500 text-sm">this month</span>
        </div>
      )}
    </div>
  )
}

export default StatsCard
