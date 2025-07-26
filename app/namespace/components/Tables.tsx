'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui3/table";
import { Badge } from "../../components/ui3/badge";
import { Button } from "../../components/ui3/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui3/card";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TableMetadata {
  id: string;
  tableName: string;
  schemaName: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

const Tables = () => {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
  const router = useRouter();

  const fetchTables = async () => {
    try {
      const response = await fetch(`${BASE_URL}/schema/table-meta`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data.map((item: any) => ({
        id: item.id,
        tableName: item.tableName,
        schemaName: item.details?.schemaName || item.schemaName || '',
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt || item.createdAt,
      })));
    } catch (error) {
      toast.error('Failed to load tables');
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshTableStatus = async (metaId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/schema/table-meta/check/${metaId}`);
      if (!response.ok) throw new Error('Failed to check table status');
      const updatedTable = await response.json();
      setTables(prev => prev.map(table => 
        table.id === metaId ? updatedTable : table
      ));
      toast.success('Table status updated');
    } catch (error) {
      toast.error('Failed to update table status');
      console.error('Error checking table status:', error);
    }
  };

  const deleteTable = async (metaId: string, tableName: string) => {
    if (!confirm(`Are you sure you want to delete table "${tableName}"?`)) return;
    try {
      const response = await fetch(`${BASE_URL}/schema/table/${metaId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete table');
      setTables(prev => prev.filter(table => table.id !== metaId));
      toast.success('Table deleted successfully');
    } catch (error) {
      toast.error('Failed to delete table');
      console.error('Error deleting table:', error);
    }
  };

  const refreshAllTables = async () => {
    setRefreshing(true);
    try {
      await Promise.all(tables.map(table => refreshTableStatus(table.id)));
      toast.success('All tables refreshed');
    } catch (error) {
      toast.error('Failed to refresh some tables');
    } finally {
      setRefreshing(false);
    }
  };

  const syncTableStatus = async () => {
    await fetch(`${BASE_URL}/schema/table-meta/check-all`, { method: 'POST' });
    fetchTables(); // Refresh the table list after syncing
  };

  const handleRowClick = (tableName: string) => {
    router.push(`/namespace/table/${tableName}`);
  };

  useEffect(() => {
    fetchTables();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Schema Tables</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllTables}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={syncTableStatus}
          >
            Sync Table Status
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {tables.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tables found. Create a schema and table to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Name</TableHead>
                <TableHead>Schema Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow
                  key={table.id}
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={() => handleRowClick(table.tableName)}
                >
                  <TableCell className="font-medium">{table.tableName}</TableCell>
                  <TableCell>{table.schemaName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={table.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className={table.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'}
                    >
                      {table.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(table.createdAt).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{new Date(table.updatedAt).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTable(table.id, table.tableName)}
                        title="Delete Table"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default Tables; 