import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Scale,
    FileText,
    Lock,
    Handshake,
    Search,
    BookOpen,
    ChevronRight,
    Image,
    Bell,
    Users,
    Database,
} from 'lucide-react';

// Import all markdown docs as raw strings
import imageOptGuide from '../../../docs/IMAGE_OPTIMIZATION_GUIDE.md?raw';
import notificationSystem from '../../../docs/NOTIFICATION_SYSTEM.md?raw';
import onboardingSystem from '../../../docs/ONBOARDING_SYSTEM.md?raw';
import multiTenancy from '../../../docs/multi-tenancy.md?raw';

import gdprDataFlows from '../../../docs/gdpr/data-flows.md?raw';
import gdprLegitimateInterest from '../../../docs/gdpr/legitimate-interest-assessment.md?raw';
import gdprRiskAssessment from '../../../docs/gdpr/risk-assessment.md?raw';
import gdprSecurityMeasures from '../../../docs/gdpr/security-measures.md?raw';

import legalDpa from '../../../docs/legal/data-processing-agreement.md?raw';
import legalPrivacy from '../../../docs/legal/privacy-policy.md?raw';
import legalTos from '../../../docs/legal/terms-of-service.md?raw';

import policyRetention from '../../../docs/policies/data-retention-policy.md?raw';
import policyIncident from '../../../docs/policies/incident-response-plan.md?raw';

import securityAudit from '../../../docs/security/audit-checklist.md?raw';

import vendorDpa from '../../../docs/vendors/dpa-status.md?raw';

// Types
interface DocEntry {
    id: string;
    title: string;
    content: string;
    category: string;
    icon: typeof Shield;
}

interface CategoryGroup {
    name: string;
    icon: typeof Shield;
    color: string;
    bgColor: string;
    docs: DocEntry[];
}

// Extract the first H1 from markdown
function extractTitle(md: string): string {
    const match = md.match(/^#\s+(.+)$/m);
    return match ? match[1].replace(/\*\*/g, '').replace(/--/g, '—').trim() : 'Untitled';
}

// Document registry
const allDocs: DocEntry[] = [
    { id: 'img-opt', title: extractTitle(imageOptGuide), content: imageOptGuide, category: 'General', icon: Image },
    { id: 'notif-sys', title: extractTitle(notificationSystem), content: notificationSystem, category: 'General', icon: Bell },
    { id: 'onboard-sys', title: extractTitle(onboardingSystem), content: onboardingSystem, category: 'General', icon: Users },
    { id: 'multi-tenant', title: extractTitle(multiTenancy), content: multiTenancy, category: 'General', icon: Database },

    { id: 'gdpr-flows', title: extractTitle(gdprDataFlows), content: gdprDataFlows, category: 'GDPR', icon: Shield },
    { id: 'gdpr-legit', title: extractTitle(gdprLegitimateInterest), content: gdprLegitimateInterest, category: 'GDPR', icon: Shield },
    { id: 'gdpr-risk', title: extractTitle(gdprRiskAssessment), content: gdprRiskAssessment, category: 'GDPR', icon: Shield },
    { id: 'gdpr-security', title: extractTitle(gdprSecurityMeasures), content: gdprSecurityMeasures, category: 'GDPR', icon: Shield },

    { id: 'legal-dpa', title: extractTitle(legalDpa), content: legalDpa, category: 'Legal', icon: Scale },
    { id: 'legal-privacy', title: extractTitle(legalPrivacy), content: legalPrivacy, category: 'Legal', icon: Scale },
    { id: 'legal-tos', title: extractTitle(legalTos), content: legalTos, category: 'Legal', icon: Scale },

    { id: 'policy-retention', title: extractTitle(policyRetention), content: policyRetention, category: 'Policies', icon: FileText },
    { id: 'policy-incident', title: extractTitle(policyIncident), content: policyIncident, category: 'Policies', icon: FileText },

    { id: 'security-audit', title: extractTitle(securityAudit), content: securityAudit, category: 'Security', icon: Lock },

    { id: 'vendor-dpa', title: extractTitle(vendorDpa), content: vendorDpa, category: 'Vendors', icon: Handshake },
];

const categoryConfig: Record<string, { icon: typeof Shield; color: string; bgColor: string }> = {
    General: { icon: BookOpen, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    GDPR: { icon: Shield, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    Legal: { icon: Scale, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    Policies: { icon: FileText, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    Security: { icon: Lock, color: 'text-red-500', bgColor: 'bg-red-500/10' },
    Vendors: { icon: Handshake, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
};

// Custom markdown components for premium styling
const markdownComponents = {
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1 className="text-3xl font-bold tracking-tight mt-2 mb-4 pb-3 border-b border-border" {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2 className="text-2xl font-semibold tracking-tight mt-8 mb-3 pb-2 border-b border-border/50" {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>{children}</h3>
    ),
    h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h4 className="text-lg font-medium mt-4 mb-2" {...props}>{children}</h4>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p className="leading-7 mb-4 text-muted-foreground" {...props}>{children}</p>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
        <ul className="my-3 ml-6 list-disc [&>li]:mt-1.5" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
        <ol className="my-3 ml-6 list-decimal [&>li]:mt-1.5" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
        <li className="leading-7 text-muted-foreground" {...props}>{children}</li>
    ),
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
        <blockquote className="mt-4 mb-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r-md" {...props}>{children}</blockquote>
    ),
    code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) => {
        const isBlock = className?.includes('language-');
        if (isBlock) {
            return (
                <code className={`block bg-zinc-950 text-zinc-100 rounded-lg p-4 my-4 overflow-x-auto text-sm font-mono whitespace-pre ${className || ''}`} {...props}>
                    {children}
                </code>
            );
        }
        return (
            <code className="relative rounded bg-muted px-[0.4rem] py-[0.2rem] font-mono text-sm font-semibold" {...props}>
                {children}
            </code>
        );
    },
    pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
        <pre className="my-4 overflow-x-auto" {...props}>{children}</pre>
    ),
    table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
        <div className="my-6 w-full overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm" {...props}>{children}</table>
        </div>
    ),
    thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
        <thead className="bg-muted/50" {...props}>{children}</thead>
    ),
    tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
        <tr className="border-b border-border transition-colors hover:bg-muted/30" {...props}>{children}</tr>
    ),
    th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
        <th className="px-4 py-3 text-left font-semibold text-foreground" {...props}>{children}</th>
    ),
    td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
        <td className="px-4 py-3 text-muted-foreground" {...props}>{children}</td>
    ),
    hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
        <hr className="my-6 border-border/50" {...props} />
    ),
    a: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors" {...props}>{children}</a>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <strong className="font-semibold text-foreground" {...props}>{children}</strong>
    ),
    input: ({ type, checked, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
        if (type === 'checkbox') {
            return (
                <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="mr-2 h-4 w-4 rounded border-border accent-primary"
                    {...props}
                />
            );
        }
        return <input type={type} {...props} />;
    },
};

export function DocumentationTab() {
    const [selectedDocId, setSelectedDocId] = useState(allDocs[0].id);
    const [searchQuery, setSearchQuery] = useState('');

    const selectedDoc = allDocs.find((d) => d.id === selectedDocId) || allDocs[0];

    // Group docs by category and filter by search
    const filteredGroups = useMemo(() => {
        const groups: CategoryGroup[] = [];
        const categoryOrder = ['General', 'GDPR', 'Legal', 'Policies', 'Security', 'Vendors'];

        for (const cat of categoryOrder) {
            const config = categoryConfig[cat];
            const docs = allDocs.filter(
                (d) =>
                    d.category === cat &&
                    (searchQuery === '' ||
                        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        d.content.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            if (docs.length > 0) {
                groups.push({
                    name: cat,
                    icon: config.icon,
                    color: config.color,
                    bgColor: config.bgColor,
                    docs,
                });
            }
        }
        return groups;
    }, [searchQuery]);

    const totalDocs = filteredGroups.reduce((sum, g) => sum + g.docs.length, 0);

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold mb-1">Documentation</h2>
                <p className="text-muted-foreground">
                    Internal documentation, policies, and compliance resources — {allDocs.length} documents
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[700px]">
                {/* Sidebar */}
                <Card className="h-fit lg:sticky lg:top-6">
                    <CardHeader className="pb-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[600px]">
                            <div className="px-3 pb-3 space-y-4">
                                {filteredGroups.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-8">
                                        No documents match your search
                                    </p>
                                )}
                                {filteredGroups.map((group) => {
                                    const GroupIcon = group.icon;
                                    return (
                                        <div key={group.name}>
                                            <div className="flex items-center gap-2 mb-2 px-2">
                                                <div className={`p-1 rounded ${group.bgColor}`}>
                                                    <GroupIcon className={`h-3.5 w-3.5 ${group.color}`} />
                                                </div>
                                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    {group.name}
                                                </span>
                                                <Badge variant="secondary" className="ml-auto text-xs h-5">
                                                    {group.docs.length}
                                                </Badge>
                                            </div>
                                            <div className="space-y-0.5">
                                                {group.docs.map((doc) => (
                                                    <button
                                                        key={doc.id}
                                                        onClick={() => setSelectedDocId(doc.id)}
                                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-150 flex items-center gap-2 group ${selectedDocId === doc.id
                                                                ? 'bg-primary/10 text-primary font-medium'
                                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                            }`}
                                                    >
                                                        <ChevronRight
                                                            className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${selectedDocId === doc.id ? 'rotate-90 text-primary' : 'text-muted-foreground/50 group-hover:text-muted-foreground'
                                                                }`}
                                                        />
                                                        <span className="truncate">{doc.title}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Main Content */}
                <Card>
                    <CardHeader className="pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${categoryConfig[selectedDoc.category]?.bgColor || 'bg-muted'}`}>
                                <selectedDoc.icon
                                    className={`h-5 w-5 ${categoryConfig[selectedDoc.category]?.color || 'text-muted-foreground'}`}
                                />
                            </div>
                            <div>
                                <CardTitle className="text-xl">{selectedDoc.title}</CardTitle>
                                <Badge
                                    variant="outline"
                                    className={`mt-1 ${categoryConfig[selectedDoc.category]?.color || ''}`}
                                >
                                    {selectedDoc.category}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[calc(700px-80px)]">
                            <div className="p-6 max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={markdownComponents as Record<string, React.ComponentType>}
                                >
                                    {selectedDoc.content}
                                </ReactMarkdown>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
