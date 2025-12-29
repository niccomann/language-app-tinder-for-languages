import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  color: 'gray' | 'green' | 'red' | 'blue' | 'indigo' | 'purple';
  isActive?: boolean;
  onClick?: () => void;
}

const colorClasses = {
  gray: {
    text: 'text-gray-600',
    border: 'border-gray-100',
    activeBorder: 'border-gray-400 ring-2 ring-gray-300',
    bg: 'from-gray-100 to-gray-200',
  },
  green: {
    text: 'text-green-600',
    border: 'border-green-100',
    activeBorder: 'border-green-400 ring-2 ring-green-300',
    bg: 'from-green-100 to-green-200',
  },
  red: {
    text: 'text-red-600',
    border: 'border-red-100',
    activeBorder: 'border-red-400 ring-2 ring-red-300',
    bg: 'from-red-100 to-red-200',
  },
  blue: {
    text: 'text-blue-600',
    border: 'border-blue-100',
    activeBorder: 'border-blue-400 ring-2 ring-blue-300',
    bg: 'from-blue-100 to-blue-200',
  },
  indigo: {
    text: 'text-indigo-600',
    border: 'border-indigo-100',
    activeBorder: 'border-indigo-400 ring-2 ring-indigo-300',
    bg: 'from-indigo-100 to-indigo-200',
  },
  purple: {
    text: 'text-purple-600',
    border: 'border-purple-100',
    activeBorder: 'border-purple-400 ring-2 ring-purple-300',
    bg: 'from-purple-100 to-purple-200',
  },
};

export function StatCard({ label, value, icon, color, isActive, onClick }: StatCardProps) {
  const colors = colorClasses[color];
  
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-lg p-6 border-2 transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:scale-105 hover:shadow-xl' : ''
      } ${isActive ? colors.activeBorder : colors.border}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`${colors.text} text-sm font-semibold mb-1`}>{label}</p>
          <p className={`text-3xl font-extrabold ${color === 'gray' ? 'text-gray-900' : colors.text}`}>
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 bg-gradient-to-br ${colors.bg} rounded-full flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
