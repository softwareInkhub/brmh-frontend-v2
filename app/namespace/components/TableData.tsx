import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui3/table";
import { Button } from "../../components/ui3/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui3/card";
import { toast } from "sonner";
import RecursiveDataForm from "../../components/common/RecursiveDataForm";

interface TableDataProps {
  tableName: string;
  onBack: () => void;
}

const TableData = ({ tableName, onBack }: TableDataProps) => {
  const [tableItems, setTableItems] = useState<any[]>([]);
  const [tableSchema, setTableSchema] = useState<any>(null);
  const [showCreateDataModal, setShowCreateDataModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

  const fetchTableData = async () => {
    setLoading(true);
    try {
      const [itemsRes, schemaRes] = await Promise.all([
        fetch(`${BASE_URL}/schema/table/${tableName}/items`),
        fetch(`${BASE_URL}/schema/table/${tableName}/schema`)
      ]);
      setTableItems(await itemsRes.json());
      setTableSchema(await schemaRes.json());
    } catch (error) {
      toast.error('Failed to load table data');
      console.error('Error fetching table data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [tableName]);

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
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <CardTitle>Table: {tableName}</CardTitle>
        </div>
        <Button
          variant="default"
          onClick={() => setShowCreateDataModal(true)}
          disabled={!tableSchema}
        >
          Create Data
        </Button>
      </CardHeader>
      <CardContent>
        {tableItems.length === 0 || !tableItems[0] ? (
          <div className="text-gray-500 text-center py-8">No items found in this table.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(tableItems[0]).map((key) => (
                    <th key={key} className="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableItems.map((item, idx) => (
                  <tr key={idx}>
                    {Object.keys(tableItems[0]).map((key) => (
                      <td key={key} className="px-2 py-2 whitespace-nowrap">{JSON.stringify(item[key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Data Modal */}
        {showCreateDataModal && tableSchema && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0  bg-opacity-30 backdrop-blur-sm"></div>
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-4xl relative z-10 border border-gray-100 flex flex-col max-h-[70vh] overflow-y-auto">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors text-2xl"
                onClick={() => setShowCreateDataModal(false)}
                aria-label="Close"
              >×</button>
              <h2 className="text-2xl font-bold mb-8 tracking-tight text-gray-800">Create Data for <span className="text-blue-600">{tableName}</span></h2>
              <div className="flex gap-8 max-h-[80vh] overflow-y-auto">
                {/* Schema Panel */}
                <div className="w-1/2 bg-gray-50 rounded-xl shadow-inner p-4 flex flex-col">
                  <h3 className="font-semibold mb-2 text-gray-700">Schema</h3>
                  <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto text-xs max-h-96 text-gray-700 font-mono">{JSON.stringify(tableSchema, null, 2)}</pre>
                </div>
                {/* Divider */}
                <div className="w-px bg-gray-200 mx-2"></div>
                {/* Form Panel */}
                <div className="w-1/2 flex flex-col">
                  <CreateDataForm
                    schema={tableSchema}
                    tableName={tableName}
                    onClose={() => setShowCreateDataModal(false)}
                    onSuccess={async () => {
                      setShowCreateDataModal(false);
                      await fetchTableData();
                    }}
                    renderButtons={false}
                  />
                </div>
              </div>
              {/* Button group at the bottom right */}
              <div className="flex justify-end gap-2 mt-8">
                <button type="button" className="bg-gray-200 px-3 py-1.5 rounded text-sm" onClick={() => setShowCreateDataModal(false)}>Cancel</button>
                <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm" onClick={() => document.getElementById('create-data-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}>Save</button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function useRandomId() {
  const [id, setId] = useState('');
  useEffect(() => {
    setId(Math.random().toString(36).slice(2, 12));
  }, []);
  return id;
}

function CreateDataForm({ schema, tableName, onClose, onSuccess, renderButtons = true }: { schema: any, tableName: string, onClose: () => void, onSuccess: () => void, renderButtons?: boolean }) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

  if (!schema || !schema.properties) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    let itemToSave = { ...form };
    try {
      const res = await fetch(`${BASE_URL}/schema/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableName, item: itemToSave })
      });
      if (res.ok) {
        onSuccess();
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to save data');
      }
    } catch (err: any) {
      setError('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id="create-data-form" onSubmit={handleSubmit} className="space-y-3">
      <RecursiveDataForm schema={schema} value={form} onChange={setForm} required={schema.required} />
      {error && <div className="text-xs text-red-600">{error}</div>}
      {renderButtons && (
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="bg-gray-200 px-3 py-1.5 rounded text-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      )}
    </form>
  );
}

export default TableData; 