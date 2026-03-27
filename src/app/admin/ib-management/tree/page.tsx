"use client";

import { useState, useEffect } from "react";
import PageShell from "@/components/PageShell";
import { GitBranch, Users, ChevronRight, ChevronDown } from "lucide-react";

interface IBNode {
  id: string;
  name: string;
  email: string;
  totalCommission: number;
  totalClients: number;
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
        <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center text-xs font-bold shrink-0">
          {node.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{node.name}</p>
          <p className="text-xs text-gray-400">{node.email}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{node.totalClients}</span>
          <span className="font-medium text-emerald-600">${node.totalCommission.toFixed(2)}</span>
        </div>
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

        const usersRes = await fetch("/api/users");
        const allUsers = usersRes.ok ? await usersRes.json() : [];

        const ibMap = new Map<string, IBNode>();
        ibUsers.forEach((ib: any) => {
          ibMap.set(ib.id, {
            id: ib.id,
            name: ib.name,
            email: ib.email,
            totalCommission: ib.totalCommission || 0,
            totalClients: 0,
            children: [],
          });
        });

        allUsers.forEach((u: any) => {
          if (u.ibParent && ibMap.has(u.ibParent.name ? u.id : "")) {
            // skip
          }
        });

        // Count clients per IB
        allUsers.forEach((u: any) => {
          ibUsers.forEach((ib: any) => {
            const node = ibMap.get(ib.id);
            if (node) node.totalClients = ib.totalClients || 0;
          });
        });

        setTree(Array.from(ibMap.values()));
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
