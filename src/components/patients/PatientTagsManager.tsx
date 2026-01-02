import { useState } from "react";
import { Tag, Plus, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePatientTags } from "@/hooks/usePatientTags";
import { cn } from "@/lib/utils";

interface PatientTagsManagerProps {
  patientId: string;
  businessId: string;
  compact?: boolean;
}

const presetColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

const defaultTags = [
  { name: 'VIP', color: '#F59E0B' },
  { name: 'Recall Due', color: '#EF4444' },
  { name: 'New Patient', color: '#10B981' },
  { name: 'Family', color: '#3B82F6' },
  { name: 'Insurance', color: '#8B5CF6' },
  { name: 'Payment Plan', color: '#EC4899' },
];

export function PatientTagsManager({ patientId, businessId, compact = false }: PatientTagsManagerProps) {
  const { tags, patientTags, isLoading, createTag, assignTag, unassignTag } = usePatientTags({ businessId, patientId });
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [showNewTagForm, setShowNewTagForm] = useState(false);

  const assignedTagIds = new Set(patientTags.map(pt => pt.tag_id));

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag({
      business_id: businessId,
      name: newTagName,
      color: newTagColor,
    });
    setNewTagName('');
    setShowNewTagForm(false);
  };

  const handleQuickCreate = async (preset: typeof defaultTags[0]) => {
    // Check if tag already exists
    const exists = tags.some(t => t.name.toLowerCase() === preset.name.toLowerCase());
    if (!exists) {
      await createTag({
        business_id: businessId,
        name: preset.name,
        color: preset.color,
      });
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {patientTags.map((pt) => (
          <Badge
            key={pt.id}
            style={{ backgroundColor: pt.tag?.color + '20', borderColor: pt.tag?.color, color: pt.tag?.color }}
            className="text-xs border"
          >
            <Tag className="h-2.5 w-2.5 mr-1" />
            {pt.tag?.name}
          </Badge>
        ))}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500">
              <Plus className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 px-1">Assign Tags</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {tags.map((tag) => {
                  const isAssigned = assignedTagIds.has(tag.id);
                  const assignment = patientTags.find(pt => pt.tag_id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-slate-100 transition-colors",
                        isAssigned && "bg-slate-50"
                      )}
                      onClick={() => isAssigned ? unassignTag(assignment!.id) : assignTag(tag.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </div>
                      {isAssigned && <Check className="h-4 w-4 text-green-500" />}
                    </button>
                  );
                })}
              </div>
              {tags.length === 0 && (
                <div className="px-2 py-4 text-center">
                  <p className="text-xs text-slate-400 mb-2">No tags created yet</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {defaultTags.slice(0, 3).map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => handleQuickCreate(preset)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Patient Tags
        </h4>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Manage Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Manage Tags</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowNewTagForm(!showNewTagForm)}
                >
                  <Plus className="h-3 w-3 mr-1" /> New
                </Button>
              </div>

              {showNewTagForm && (
                <div className="p-2 bg-slate-50 rounded-lg space-y-2">
                  <Input
                    placeholder="Tag name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-1">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          "w-6 h-6 rounded-full transition-transform",
                          newTagColor === color && "ring-2 ring-offset-2 ring-slate-400 scale-110"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTagColor(color)}
                      />
                    ))}
                  </div>
                  <Button size="sm" className="w-full h-7" onClick={handleCreateTag}>
                    Create Tag
                  </Button>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1">
                {tags.length === 0 && !showNewTagForm && (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-400 mb-3">Quick add suggested tags:</p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {defaultTags.map((preset) => (
                        <Button
                          key={preset.name}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleQuickCreate(preset)}
                        >
                          <div
                            className="w-2 h-2 rounded-full mr-1"
                            style={{ backgroundColor: preset.color }}
                          />
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {tags.map((tag) => {
                  const isAssigned = assignedTagIds.has(tag.id);
                  const assignment = patientTags.find(pt => pt.tag_id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-slate-100 transition-colors",
                        isAssigned && "bg-slate-50"
                      )}
                      onClick={() => isAssigned ? unassignTag(assignment!.id) : assignTag(tag.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </div>
                      {isAssigned && <Check className="h-4 w-4 text-green-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-2">
        {patientTags.length === 0 ? (
          <span className="text-xs text-slate-400">No tags assigned</span>
        ) : (
          patientTags.map((pt) => (
            <div
              key={pt.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border"
              style={{
                backgroundColor: pt.tag?.color + '15',
                borderColor: pt.tag?.color + '40',
                color: pt.tag?.color,
              }}
            >
              <Tag className="h-3 w-3" />
              {pt.tag?.name}
              <button
                onClick={() => unassignTag(pt.id)}
                className="ml-0.5 hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
