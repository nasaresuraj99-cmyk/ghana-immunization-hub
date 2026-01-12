import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MapPin,
  Calendar,
  Plus,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import type { 
  OutreachSession, 
  OutreachInventoryAllocation, 
  VaccineInventory 
} from '@/types/inventory';
import { format, parseISO } from 'date-fns';

interface OutreachSessionManagerProps {
  sessions: OutreachSession[];
  allocations: OutreachInventoryAllocation[];
  inventory: VaccineInventory[];
  onCreateSession: (data: Omit<OutreachSession, 'id' | 'facility_id' | 'created_by_user_id' | 'created_at' | 'updated_at'>) => Promise<string | null>;
  onAllocateInventory: (sessionId: string, inventoryId: string, quantity: number) => Promise<boolean>;
  onReconcileAllocation: (allocationId: string, usedQty: number, wastedQty: number, wastageReason?: string) => Promise<boolean>;
}

export function OutreachSessionManager({
  sessions,
  allocations,
  inventory,
  onCreateSession,
  onAllocateInventory,
  onReconcileAllocation
}: OutreachSessionManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAllocateDialog, setShowAllocateDialog] = useState(false);
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<OutreachSession | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState<OutreachInventoryAllocation | null>(null);
  
  const [sessionForm, setSessionForm] = useState({
    session_name: '',
    session_date: new Date().toISOString().split('T')[0],
    location: '',
    status: 'planned' as OutreachSession['status'],
    notes: ''
  });

  const [allocateForm, setAllocateForm] = useState({
    inventory_id: '',
    quantity: 0
  });

  const [reconcileForm, setReconcileForm] = useState({
    used_quantity: 0,
    wasted_quantity: 0,
    wastage_reason: ''
  });

  const getSessionAllocations = (sessionId: string) => {
    return allocations.filter(a => a.outreach_session_id === sessionId);
  };

  const getStatusBadge = (status: OutreachSession['status']) => {
    switch (status) {
      case 'planned':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Planned</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-500"><ArrowRight className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateSession = async () => {
    if (!sessionForm.session_name || !sessionForm.session_date) return;
    
    const sessionId = await onCreateSession(sessionForm);
    if (sessionId) {
      setShowCreateDialog(false);
      setSessionForm({
        session_name: '',
        session_date: new Date().toISOString().split('T')[0],
        location: '',
        status: 'planned',
        notes: ''
      });
    }
  };

  const handleAllocate = async () => {
    if (!selectedSession || !allocateForm.inventory_id || !allocateForm.quantity) return;
    
    const success = await onAllocateInventory(
      selectedSession.id,
      allocateForm.inventory_id,
      allocateForm.quantity
    );
    
    if (success) {
      setShowAllocateDialog(false);
      setAllocateForm({ inventory_id: '', quantity: 0 });
    }
  };

  const handleReconcile = async () => {
    if (!selectedAllocation) return;
    
    const success = await onReconcileAllocation(
      selectedAllocation.id,
      reconcileForm.used_quantity,
      reconcileForm.wasted_quantity,
      reconcileForm.wastage_reason
    );
    
    if (success) {
      setShowReconcileDialog(false);
      setSelectedAllocation(null);
      setReconcileForm({ used_quantity: 0, wasted_quantity: 0, wastage_reason: '' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Outreach Sessions</h3>
          <p className="text-sm text-muted-foreground">
            Manage vaccine allocations for outreach activities
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Outreach Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Session Name *</Label>
                <Input
                  value={sessionForm.session_name}
                  onChange={(e) => setSessionForm({ ...sessionForm, session_name: e.target.value })}
                  placeholder="e.g., Community Vaccination Day"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={sessionForm.session_date}
                    onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={sessionForm.location}
                    onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                    placeholder="e.g., School premises"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <Button onClick={handleCreateSession} className="w-full">
                Create Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No outreach sessions created yet</p>
            <p className="text-sm">Create a session to allocate vaccines for outreach activities</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map(session => {
            const sessionAllocs = getSessionAllocations(session.id);
            const totalAllocated = sessionAllocs.reduce((sum, a) => sum + a.allocated_quantity, 0);
            const totalUsed = sessionAllocs.reduce((sum, a) => sum + a.used_quantity, 0);
            const totalReturned = sessionAllocs.reduce((sum, a) => sum + a.returned_quantity, 0);
            const pendingReconciliation = sessionAllocs.filter(a => a.status !== 'reconciled').length;

            return (
              <Card key={session.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{session.session_name}</CardTitle>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(session.session_date), 'dd MMM yyyy')}
                        </span>
                        {session.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-4 text-center">
                    <div className="p-2 bg-muted rounded-lg">
                      <p className="text-xl font-bold">{totalAllocated}</p>
                      <p className="text-xs text-muted-foreground">Allocated</p>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <p className="text-xl font-bold text-green-600">{totalUsed}</p>
                      <p className="text-xs text-muted-foreground">Used</p>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <p className="text-xl font-bold text-blue-600">{totalReturned}</p>
                      <p className="text-xs text-muted-foreground">Returned</p>
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      <p className="text-xl font-bold text-orange-600">{pendingReconciliation}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>

                  {/* Allocations Table */}
                  {sessionAllocs.length > 0 && (
                    <ScrollArea className="h-[150px] mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vaccine</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead className="text-center">Allocated</TableHead>
                            <TableHead className="text-center">Used</TableHead>
                            <TableHead className="text-center">Returned</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sessionAllocs.map(alloc => {
                            const invItem = inventory.find(i => i.id === alloc.inventory_id);
                            return (
                              <TableRow key={alloc.id}>
                                <TableCell>{invItem?.vaccine_name || 'Unknown'}</TableCell>
                                <TableCell className="font-mono text-xs">{invItem?.batch_number}</TableCell>
                                <TableCell className="text-center">{alloc.allocated_quantity}</TableCell>
                                <TableCell className="text-center text-green-600">{alloc.used_quantity}</TableCell>
                                <TableCell className="text-center text-blue-600">{alloc.returned_quantity}</TableCell>
                                <TableCell>
                                  {alloc.status === 'reconciled' ? (
                                    <Badge variant="outline" className="text-green-600">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Reconciled
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Pending</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {alloc.status !== 'reconciled' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedAllocation(alloc);
                                        setReconcileForm({
                                          used_quantity: 0,
                                          wasted_quantity: 0,
                                          wastage_reason: ''
                                        });
                                        setShowReconcileDialog(true);
                                      }}
                                    >
                                      Reconcile
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}

                  {/* Actions */}
                  {session.status !== 'completed' && session.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSession(session);
                        setShowAllocateDialog(true);
                      }}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Allocate Vaccines
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Allocate Dialog */}
      <Dialog open={showAllocateDialog} onOpenChange={setShowAllocateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Vaccines to Session</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{selectedSession.session_name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(selectedSession.session_date), 'dd MMM yyyy')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Select Vaccine Batch *</Label>
                <Select
                  value={allocateForm.inventory_id}
                  onValueChange={(value) => setAllocateForm({ ...allocateForm, inventory_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.filter(i => i.quantity > 0 && i.status !== 'expired').map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.vaccine_name} - {item.batch_number} ({item.quantity} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity to Allocate *</Label>
                <Input
                  type="number"
                  min="1"
                  value={allocateForm.quantity || ''}
                  onChange={(e) => setAllocateForm({ ...allocateForm, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>

              <Button onClick={handleAllocate} className="w-full">
                Allocate to Session
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reconcile Dialog */}
      <Dialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile Allocation</DialogTitle>
          </DialogHeader>
          {selectedAllocation && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm">
                  Allocated: <span className="font-bold">{selectedAllocation.allocated_quantity}</span> doses
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Used Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    max={selectedAllocation.allocated_quantity}
                    value={reconcileForm.used_quantity || ''}
                    onChange={(e) => setReconcileForm({ ...reconcileForm, used_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wasted Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    max={selectedAllocation.allocated_quantity - reconcileForm.used_quantity}
                    value={reconcileForm.wasted_quantity || ''}
                    onChange={(e) => setReconcileForm({ ...reconcileForm, wasted_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {reconcileForm.wasted_quantity > 0 && (
                <div className="space-y-2">
                  <Label>Wastage Reason</Label>
                  <Input
                    value={reconcileForm.wastage_reason}
                    onChange={(e) => setReconcileForm({ ...reconcileForm, wastage_reason: e.target.value })}
                    placeholder="Reason for wastage..."
                  />
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm">
                <p>
                  <span className="font-medium">Returned to stock:</span>{' '}
                  {selectedAllocation.allocated_quantity - reconcileForm.used_quantity - reconcileForm.wasted_quantity} doses
                </p>
              </div>

              <Button 
                onClick={handleReconcile} 
                className="w-full"
                disabled={
                  reconcileForm.used_quantity + reconcileForm.wasted_quantity > selectedAllocation.allocated_quantity ||
                  (reconcileForm.wasted_quantity > 0 && !reconcileForm.wastage_reason)
                }
              >
                Complete Reconciliation
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
