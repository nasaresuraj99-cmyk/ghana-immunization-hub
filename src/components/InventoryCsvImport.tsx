import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { GHANA_EPI_VACCINES, type InventoryFormData } from '@/types/inventory';
import { format } from 'date-fns';

interface CsvRow {
  vaccine_name: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  received_date?: string;
  supplier?: string;
  storage_location?: string;
  temperature_requirement?: string;
  notes?: string;
}

interface ImportResult {
  row: number;
  data: CsvRow;
  status: 'pending' | 'success' | 'error' | 'warning';
  message?: string;
}

interface InventoryCsvImportProps {
  onImport: (data: InventoryFormData) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

export function InventoryCsvImport({ onImport, onRefresh }: InventoryCsvImportProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ImportResult[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download CSV template
  const downloadTemplate = () => {
    const headers = [
      'vaccine_name',
      'batch_number',
      'quantity',
      'expiry_date',
      'received_date',
      'supplier',
      'storage_location',
      'temperature_requirement',
      'notes'
    ];

    const sampleData = [
      ['BCG', 'BCG-2025-001', '100', '2026-12-31', format(new Date(), 'yyyy-MM-dd'), 'UNICEF', 'Main Refrigerator', '2-8°C', 'Sample batch'],
      ['Penta', 'PENTA-2025-002', '200', '2026-06-30', format(new Date(), 'yyyy-MM-dd'), 'Ghana Health Service', 'Cold Room A', '2-8°C', ''],
      ['OPV', 'OPV-2025-003', '150', '2025-09-15', format(new Date(), 'yyyy-MM-dd'), 'WHO', 'Freezer 1', '-20°C', 'Handle with care']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vaccine-inventory-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  // Parse CSV file
  const parseCSV = (text: string): CsvRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const rows: CsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim().replace(/['"]/g, '') || '';
      });

      // Parse quantity as number
      row.quantity = parseInt(row.quantity) || 0;

      rows.push(row as CsvRow);
    }

    return rows;
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  // Validate row
  const validateRow = (row: CsvRow, rowIndex: number): ImportResult => {
    const result: ImportResult = {
      row: rowIndex + 1,
      data: row,
      status: 'pending'
    };

    // Check vaccine name
    if (!row.vaccine_name) {
      result.status = 'error';
      result.message = 'Vaccine name is required';
      return result;
    }

    // Validate vaccine name is in EPI list
    const normalizedVaccineName = GHANA_EPI_VACCINES.find(
      v => v.toLowerCase() === row.vaccine_name.toLowerCase()
    );
    if (!normalizedVaccineName) {
      result.status = 'warning';
      result.message = `Unknown vaccine: ${row.vaccine_name}. Will be imported as-is.`;
      row.vaccine_name = row.vaccine_name;
    } else {
      row.vaccine_name = normalizedVaccineName;
    }

    // Check batch number
    if (!row.batch_number) {
      result.status = 'error';
      result.message = 'Batch number is required';
      return result;
    }

    // Check quantity
    if (!row.quantity || row.quantity <= 0) {
      result.status = 'error';
      result.message = 'Quantity must be greater than 0';
      return result;
    }

    // Check expiry date
    if (!row.expiry_date) {
      result.status = 'error';
      result.message = 'Expiry date is required';
      return result;
    }

    // Validate date format
    const expiryDate = new Date(row.expiry_date);
    if (isNaN(expiryDate.getTime())) {
      result.status = 'error';
      result.message = 'Invalid expiry date format (use YYYY-MM-DD)';
      return result;
    }

    // Check if expired
    if (expiryDate < new Date()) {
      result.status = 'warning';
      result.message = 'Vaccine is already expired';
    }

    // Set default received date
    if (!row.received_date) {
      row.received_date = format(new Date(), 'yyyy-MM-dd');
    }

    if (result.status === 'pending') {
      result.status = 'pending';
    }

    return result;
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        
        if (rows.length === 0) {
          toast.error('No valid data found in CSV');
          return;
        }

        const validated = rows.map((row, index) => validateRow(row, index));
        setPreview(validated);
        setImportComplete(false);
        setImportProgress(0);
        toast.success(`${rows.length} rows loaded for preview`);
      } catch (err: any) {
        toast.error(`Failed to parse CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Import all valid rows
  const handleImport = async () => {
    const validRows = preview.filter(r => r.status !== 'error');
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    const updatedResults = [...preview];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < preview.length; i++) {
      const item = preview[i];
      
      if (item.status === 'error') {
        continue;
      }

      try {
        const formData: InventoryFormData = {
          vaccine_name: item.data.vaccine_name,
          batch_number: item.data.batch_number,
          quantity: item.data.quantity,
          expiry_date: item.data.expiry_date,
          received_date: item.data.received_date,
          supplier: item.data.supplier,
          storage_location: item.data.storage_location,
          temperature_requirement: item.data.temperature_requirement || '2-8°C',
          notes: item.data.notes
        };

        const success = await onImport(formData);
        
        if (success) {
          updatedResults[i] = { ...item, status: 'success', message: 'Imported successfully' };
          successCount++;
        } else {
          updatedResults[i] = { ...item, status: 'error', message: 'Import failed' };
          errorCount++;
        }
      } catch (err: any) {
        updatedResults[i] = { ...item, status: 'error', message: err.message };
        errorCount++;
      }

      setImportProgress(((i + 1) / preview.length) * 100);
      setPreview([...updatedResults]);

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setImporting(false);
    setImportComplete(true);
    
    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} items`);
      await onRefresh();
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} items`);
    }
  };

  // Get status icon
  const getStatusIcon = (status: ImportResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Summary counts
  const errorCount = preview.filter(r => r.status === 'error').length;
  const warningCount = preview.filter(r => r.status === 'warning').length;
  const successCount = preview.filter(r => r.status === 'success').length;
  const pendingCount = preview.filter(r => r.status === 'pending' || r.status === 'warning').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Vaccine Inventory
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Instructions */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Upload a CSV file with columns: vaccine_name, batch_number, quantity, expiry_date (YYYY-MM-DD), 
              received_date, supplier, storage_location, temperature_requirement, notes
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Select CSV File
              </Button>
            </div>
            {preview.length > 0 && !importing && (
              <Button 
                onClick={handleImport}
                disabled={errorCount === preview.length}
              >
                Import {pendingCount} Items
              </Button>
            )}
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Importing...</span>
              </div>
              <Progress value={importProgress} />
            </div>
          )}

          {/* Summary */}
          {preview.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{preview.length} Total</Badge>
              {pendingCount > 0 && <Badge className="bg-blue-500">{pendingCount} Ready</Badge>}
              {successCount > 0 && <Badge className="bg-green-500">{successCount} Imported</Badge>}
              {warningCount > 0 && <Badge className="bg-yellow-500">{warningCount} Warnings</Badge>}
              {errorCount > 0 && <Badge variant="destructive">{errorCount} Errors</Badge>}
            </div>
          )}

          {/* Preview Table */}
          {preview.length > 0 && (
            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((item, index) => (
                    <TableRow key={index} className={item.status === 'error' ? 'bg-destructive/10' : ''}>
                      <TableCell className="font-mono text-xs">{item.row}</TableCell>
                      <TableCell>{getStatusIcon(item.status)}</TableCell>
                      <TableCell className="font-medium">{item.data.vaccine_name}</TableCell>
                      <TableCell className="font-mono text-xs">{item.data.batch_number}</TableCell>
                      <TableCell>{item.data.quantity}</TableCell>
                      <TableCell>{item.data.expiry_date}</TableCell>
                      <TableCell>{item.data.supplier || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {item.message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {importComplete && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Import complete! {successCount} items were successfully added to inventory.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
