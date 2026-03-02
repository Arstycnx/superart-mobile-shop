import { statusLabels } from '../../data/mockData';

const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
    waiting_parts: 'bg-purple-100 text-purple-700 border-purple-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    active: 'bg-green-100 text-green-700 border-green-200',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200',
    paid: 'bg-green-100 text-green-700 border-green-200',
    partial: 'bg-orange-100 text-orange-700 border-orange-200',
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const dotColors = {
    pending: 'bg-yellow-500',
    in_progress: 'bg-blue-500',
    waiting_parts: 'bg-purple-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
    active: 'bg-green-500',
    inactive: 'bg-slate-400',
    paid: 'bg-green-500',
    partial: 'bg-orange-500',
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-slate-400',
};

export default function StatusBadge({ status, showDot = false }) {
    const label = statusLabels[status] || status;
    const style = statusStyles[status] || 'bg-slate-100 text-slate-600 border-slate-200';
    const dot = dotColors[status] || 'bg-slate-400';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}>
            {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
            {label}
        </span>
    );
}
