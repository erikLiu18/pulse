import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { DailyStat } from '../../lib/api';

interface Props {
  stats: DailyStat[];
}

const FULL_DAY = 1440; // 24h in minutes

const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, total_minutes, color }: any) => {
  if (total_minutes / FULL_DAY < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const hours = (total_minutes / 60).toFixed(1).replace(/\.0$/, '');
  return (
    <text x={x} y={y} fill={color} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={500}>
      {name} {hours}h
    </text>
  );
};

export default function DailyRing({ stats }: Props) {
  // Separate unlabeled from tracked categories
  const unlabeledStat = stats.find((s) => s.name === 'Unlabeled');
  const trackedStats = stats.filter((s) => s.name !== 'Unlabeled');
  const trackedMinutes = trackedStats.reduce((sum, s) => sum + s.total_minutes, 0);
  const trackedHours = (trackedMinutes / 60).toFixed(1).replace(/\.0$/, '');

  // Build donut data: all categories with time > 0, always including Unlabeled to fill 24h
  const unlabeledMinutes = unlabeledStat ? unlabeledStat.total_minutes : Math.max(0, FULL_DAY - trackedMinutes);
  const data = [
    ...trackedStats.filter((s) => s.total_minutes > 0),
    ...(unlabeledMinutes > 0 ? [{ id: 6, name: 'Unlabeled', color: '#9CA3AF', icon: '❓', total_minutes: unlabeledMinutes }] : []),
  ];

  // Fallback if absolutely nothing
  const hasData = data.length > 0 && data.some((d) => d.total_minutes > 0);
  const chartData = hasData ? data : [{ name: 'Empty', total_minutes: 1, color: '#E5E7EB' }];

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-64 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="total_minutes"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={85}
              startAngle={90}
              endAngle={-270}
              paddingAngle={hasData ? 3 : 0}
              stroke="none"
              label={hasData ? renderCustomLabel : undefined}
              labelLine={false}
              isAnimationActive={false}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">
            {trackedMinutes > 0 ? `${trackedHours} / 24h` : '0 / 24h'}
          </span>
        </div>
      </div>

      {trackedMinutes > 0 && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3 px-4">
          {trackedStats
            .filter((s) => s.total_minutes > 0)
            .map((s) => {
              const hours = (s.total_minutes / 60).toFixed(1).replace(/\.0$/, '');
              return (
                <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name} {hours}h
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
