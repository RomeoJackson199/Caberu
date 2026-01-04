/**
 * UndoDemo Component
 *
 * Demonstrates the Gmail-style undo functionality.
 * This is a development/testing component to showcase the undo system.
 */

import { useState } from 'react';
import { useUndoManager } from '@/hooks/useUndoManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RefreshCw, Plus, Minus } from 'lucide-react';

interface DemoItem {
  id: string;
  name: string;
  count: number;
}

export function UndoDemo() {
  const { executeWithUndo, executeOptimistic } = useUndoManager();
  const [items, setItems] = useState<DemoItem[]>([
    { id: '1', name: 'Item 1', count: 5 },
    { id: '2', name: 'Item 2', count: 10 },
    { id: '3', name: 'Item 3', count: 15 },
  ]);

  /**
   * Delete item with undo
   */
  const handleDelete = async (item: DemoItem) => {
    // Save snapshot
    const snapshot = { ...item };

    // Update UI optimistically
    setItems(prev => prev.filter(i => i.id !== item.id));

    await executeWithUndo({
      message: `${item.name} deleted`,
      description: 'Click undo to restore',
      undoDelay: 5000,
      action: async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Item deleted:', item.id);
      },
      undo: async () => {
        // Restore item
        setItems(prev => [...prev, snapshot].sort((a, b) => a.id.localeCompare(b.id)));
        console.log('Item restored:', item.id);
      },
    });
  };

  /**
   * Increment count with optimistic update
   */
  const handleIncrement = async (item: DemoItem) => {
    const oldCount = item.count;
    const newCount = item.count + 1;

    // Update UI optimistically
    setItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, count: newCount } : i)
    );

    await executeOptimistic({
      message: `${item.name} incremented`,
      description: `${oldCount} → ${newCount}`,
      action: async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Count updated:', newCount);
      },
      rollback: () => {
        // Rollback if failed
        setItems(prev =>
          prev.map(i => i.id === item.id ? { ...i, count: oldCount } : i)
        );
      },
    });
  };

  /**
   * Decrement count with undo
   */
  const handleDecrement = async (item: DemoItem) => {
    if (item.count <= 0) return;

    const oldCount = item.count;
    const newCount = item.count - 1;

    // Update UI optimistically
    setItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, count: newCount } : i)
    );

    await executeWithUndo({
      message: `${item.name} decremented`,
      description: `${oldCount} → ${newCount}`,
      undoDelay: 5000,
      action: async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Count decremented:', newCount);
      },
      undo: async () => {
        // Restore old count
        setItems(prev =>
          prev.map(i => i.id === item.id ? { ...i, count: oldCount } : i)
        );
        console.log('Count restored:', oldCount);
      },
    });
  };

  /**
   * Reset all items
   */
  const handleReset = () => {
    setItems([
      { id: '1', name: 'Item 1', count: 5 },
      { id: '2', name: 'Item 2', count: 10 },
      { id: '3', name: 'Item 3', count: 15 },
    ]);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Gmail-Style Undo Demo
          </CardTitle>
          <CardDescription>
            Test the undo functionality with these interactive examples.
            Destructive actions (delete, decrement) show an undo button for 5 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Items</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset All
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              All items deleted. Click "Reset All" to restore.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <Card key={item.id} className="border-2">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Count: {item.count}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleIncrement(item)}
                        className="gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecrement(item)}
                        disabled={item.count <= 0}
                        className="gap-1"
                      >
                        <Minus className="w-4 h-4" />
                        Remove
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item)}
                        className="gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">How to test:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• <strong>Delete</strong> - Removes item, shows undo toast for 5 seconds</li>
              <li>• <strong>Remove (-)</strong> - Decreases count, shows undo toast</li>
              <li>• <strong>Add (+)</strong> - Increases count, optimistic update (no undo)</li>
              <li>• <strong>Reset All</strong> - Restores initial state</li>
            </ul>
          </div>

          <div className="mt-4 p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
            <p className="text-sm">
              <strong>Note:</strong> This is a demo component. In production, these actions would
              actually update the database. Here, we're just simulating the UX flow.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
