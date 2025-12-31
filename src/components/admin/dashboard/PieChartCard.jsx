import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as LucidePieChart } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PieChartCard = ({
  title,
  data,
  dataKey,
  nameKey,
  colors,
  onPieClick
}) => {
  if (!data || data.length === 0) {
    return (
      <Card className="glass-effect border-0 shadow-xl col-span-1 md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><LucidePieChart className="mr-2 h-5 w-5" />{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Data tidak tersedia.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="glass-effect border-0 shadow-xl col-span-1 md:col-span-2 lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-xl flex items-center"><LucidePieChart className="mr-2 h-5 w-5" />{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={nameKey}
              label={({ name, percentage }) => `${name} (${(percentage * 100).toFixed(0)}%)`}
              onClick={onPieClick ? (d) => onPieClick(d.name) : undefined}
              className={onPieClick ? 'cursor-pointer' : ''}
            >
              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(value, name, props) => {
              const percentage = props.payload.percentage !== undefined ? (props.payload.percentage * 100).toFixed(1) : 'N/A';
              return [`${value} (${percentage}%)`, name];
            }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PieChartCard;