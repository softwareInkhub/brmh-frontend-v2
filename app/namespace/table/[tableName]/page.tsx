'use client';
import TableData from '../../components/TableData';
import { use } from 'react';

export default function TableDataPage({ params }: { params: Promise<{ tableName: string }> }) {
  const { tableName } = use(params);

  return (
    <TableData
      tableName={tableName}
      onBack={() => window.history.back()}
    />
  );
} 