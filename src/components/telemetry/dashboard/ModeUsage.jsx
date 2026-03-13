import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#38bdf8','#a78bfa','#34d399','#f59e0b','#ef4444'];

export default function ModeUsage({ data=[
  { name:'Sri', value: 45 },
  { name:'Sree', value: 35 },
  { name:'Text Chat', value: 8 },
  { name:'Voice Chat', value: 7 },
  { name:'Agentic Sree', value: 5 },
] }){
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistant Mode Usage</CardTitle>
      </CardHeader>
      <CardContent style={{height:260}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {data.map((entry, index) => (
                <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}