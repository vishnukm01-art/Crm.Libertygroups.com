"use client";

import { useState, useEffect } from "react";
import { GitBranch, Users, ChevronDown, ChevronRight, Network } from "lucide-react";

interface TreeNode {
  id: string; name: string; email: string; isIB: boolean;
  status: string; children: TreeNode[]; level: number;
}

function TreeNodeComponent({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-3 py-2">
        {depth > 0 && (
          <div className="flex items-center">
            <div className="w-6 border-t-2 border-dashed border-gray-300" />
          </div>
        )}
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
            node.isIB
              ? "bg-sky-50 border-sky-200 hover:bg-sky-100"
              : "bg-white border-gray-200 hover:bg-gray-50"
          }`}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="w-4 h-4 text-sky-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <div className="w-4 h-4 shrink-0" />
          )}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
            node.isIB ? "bg-gradient-to-br from-sky-400 to-sky-600" : "bg-gradient-to-br from-gray-400 to-gray-600"
          }`}>
            {node.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">{node.name}</p>
            <p className="text-xs text-gray-500">{node.email}</p>
          </div>
          {node.isIB && (
            <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-xs font-medium ml-2">IB</span>
          )}
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-medium ml-1">
            L{depth}
          </span>
          {hasChildren && (
            <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-xs font-medium ml-1">
              {node.children.length}
            </span>
          )}
        </button>
      </div>
      {hasChildren && expanded && (
        <div className="ml-8 pl-4 border-l-2 border-dashed border-gray-200">
          {node.children.map((child) => (
            <TreeNodeComponent key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function IBTreeChartPage() {
  const [tree, setTree] = useState<{
    root: { id: string; name: string; email: string; isIB: boolean };
    children: TreeNode[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/ib-tree")
      .then((r) => (r.ok ? r.json() : null))
      .then(setTree)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Count total nodes
  const countNodes = (nodes: TreeNode[]): number => {
    return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children || []), 0);
  };

  // Count max depth
  const getMaxDepth = (nodes: TreeNode[], d: number): number => {
    if (nodes.length === 0) return d;
    return Math.max(...nodes.map((n) => getMaxDepth(n.children || [], d + 1)));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <GitBranch className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IB Tree Chart</h1>
          <p className="text-sm text-gray-500">Your referral network hierarchy</p>
        </div>
      </div>

      {tree ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{countNodes(tree.children)}</p>
              <p className="text-xs text-gray-500">Total Members</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-sky-600">{tree.children.filter((c) => c.isIB).length}</p>
              <p className="text-xs text-gray-500">Direct Sub-IBs</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{getMaxDepth(tree.children, 0)}</p>
              <p className="text-xs text-gray-500">Max Depth</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 overflow-auto">
            {/* Root node */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white mb-4 inline-flex">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold">
                {tree.root.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-bold">{tree.root.name}</p>
                <p className="text-sky-100 text-xs">{tree.root.email}</p>
              </div>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium ml-2">Root</span>
            </div>

            {tree.children.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No referrals in your network yet.</p>
              </div>
            ) : (
              <div className="ml-4 pl-4 border-l-2 border-dashed border-sky-200">
                {tree.children.map((child) => (
                  <TreeNodeComponent key={child.id} node={child} depth={1} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400">Unable to load tree data.</p>
        </div>
      )}
    </div>
  );
}
