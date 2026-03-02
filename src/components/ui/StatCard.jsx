import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend, trendLabel }) {
    const colorMap = {
        blue: { bg: 'bg-blue-50', icon: 'bg-accent-blue', text: 'text-accent-blue' },
        green: { bg: 'bg-green-50', icon: 'bg-accent-green', text: 'text-accent-green' },
        orange: { bg: 'bg-orange-50', icon: 'bg-accent-orange', text: 'text-accent-orange' },
        red: { bg: 'bg-red-50', icon: 'bg-accent-red', text: 'text-accent-red' },
        purple: { bg: 'bg-purple-50', icon: 'bg-purple-500', text: 'text-purple-500' },
    };

    const c = colorMap[color] || colorMap.blue;

    return (
        <div className="stat-card flex items-start justify-between">
            <div className="flex-1">
                <p className="text-sm text-text-secondary font-medium mb-1">{title}</p>
                <p className="text-3xl font-bold text-text-primary mb-1">{value}</p>
                {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {trend >= 0
                            ? <TrendingUp size={14} />
                            : <TrendingDown size={14} />}
                        <span>{trendLabel || `${trend > 0 ? '+' : ''}${trend}%`}</span>
                    </div>
                )}
            </div>
            {Icon && (
                <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={22} className="text-white" />
                </div>
            )}
        </div>
    );
}
