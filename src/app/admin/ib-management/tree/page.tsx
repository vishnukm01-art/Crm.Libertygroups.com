"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { GitBranch, Users, ChevronRight, ChevronDown, Eye } from "lucide-react";

interface IBNode {
  id: string;
  name: string;
  email: string;
  totalCommission: number;
  totalClients: number;
  isIB: boolean;
  ibParentId: string | null;
  children: IBNode[];
}

function TreeNode({ node, depth = 0 }: { node: IBNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-sky-100 pl-4" : ""}>
      <div
        className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-sky-50/50 transition-colors cursor-pointer group"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="w-4 h-4 text-sky-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <div className="w-4 h-4 shrink-0" />
        )}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
          node.isIB ? "bg-sky-100 text-sky-600" : "bg-gray-100 text-gray-600"
        }`}>
          {node.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{node.name}</p>
          <p className="text-xs text-gray-400">{node.email}</p>
        </div>
        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium">L{depth}</span>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{node.totalClients}</span>
          <span className="font-medium text-emerald-600">${node.totalCommission.toFixed(2)}</span>
        </div>
        {node.isIB && (
          <Link href={`/admin/ib-management/${node.id}/clients`} onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-sky-500 text-white rounded-md text-xs font-medium hover:bg-sky-600 transition-all flex items-center gap-1">
            <Eye className="w-3 h-3" />View
          </Link>
        )}
      </div>
      {expanded && hasChildren && (
        <div className="mt-1">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function IBTreePage() {
  const [tree, setTree] = useState<IBNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ib/users");
        if (!res.ok) return;
        const ibUsers = await res.json();

        // Build a proper tree from the IB users
        // Fetch all users to understand the parent-child relationships
        const allUsersRes = await fetch("/api/users?includeParent=true");
        const allUsers = allUsersRes.ok ? await allUsersRes.json() : [];

        const ibIds = new Set(ibUsers.map((ib: { id: string }) => ib.id));
        const nodeMap = new Map<string, IBNode>();

        // Create nodes for all IBs
        ibUsers.forEach((ib: { id: string; name: string; email: string; totalCommission: number; totalClients: number }) => {
          nodeMap.set(ib.id, {
            id: ib.id,
            name: ib.name,
            email: ib.email,
            totalCommission: ib.totalCommission || 0,
            totalClients: ib.totalClients || 0,
            isIB: true,
            ibParentId: null,
            children: [],
          });
        });

        // Set parent relationships from allUsers data
        allUsers.forEach((u: { id: string; ibParentId?: string }) => {
          const node = nodeMap.get(u.id);
          if (node && u.ibParentId) {
            node.ibParentId = u.ibParentId;
          }
        });

        // Build tree: attach children to parents
        const rootNodes: IBNode[] = [];
        nodeMap.forEach((node) => {
          if (node.ibParentId && nodeMap.has(node.ibParentId)) {
            nodeMap.get(node.ibParentId)!.children.push(node);
          } else {
            rootNodes.push(node);
          }
        });

        setTree(rootNodes);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <PageShell title="IB Tree" description="Visualize IB hierarchy and relationships" icon={GitBranch}>
        <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>
      </PageShell>
    );
  }

  return (
    <PageShell title="IB Tree" description="Visualize IB hierarchy and relationships" icon={GitBranch}>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 min-h-[400px]">
        {tree.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-8 h-8 text-sky-400" />
              </div>
              <p className="text-gray-500 text-sm">No IB accounts found. Promote a client to IB to see the tree.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map((node) => (
              <TreeNode key={node.id} node={node} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
