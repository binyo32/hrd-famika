import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  color,
  bgColor,
  percentage,
  onClick,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.random() * 0.2 }}
    onClick={onClick}
    className={onClick ? 'cursor-pointer h-full' : 'h-full'}
  >
    <Card className={`${bgColor} border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 h-full flex flex-col`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg bg-gradient-to-r ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-end flex-grow">
        <div className="text-2xl font-bold">{value}</div>
        {percentage !== undefined && <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% dari total</p>}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  </motion.div>
);

export default StatCard;