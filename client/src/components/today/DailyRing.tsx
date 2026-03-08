import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { DailyStat } from '../../lib/api';

interface Props {
  stats: DailyStat[];
}

export default function DailyRing({ stats }: Props) {
  const totalMinutes = stats.reduce((sum, s) => sum + s.total_minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1).replace(/\.0$/, '');
  const hasData = totalMinutes > 0;

  const data = hasData
    ? stats.filter((s) => s.total_minutes > 0)
    : [{ name: 'Empty', total_minutes: 1, color: '#E5E7EB' }];

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-44 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total_minutes"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
              startAngle={90}
              endAngle={-270}
              paddingAngle={hasData ? 3 : 0}
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">
            {hasData ? `${totalHours}h` : '0h'}
          </span>
        </div>
      </div>

      {hasData && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3 px-4">
          {stats
            .filter((s) => s.total_minutes > 0)
            .map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
