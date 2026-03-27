"use client";

import { useState, useEffect } from "react";
import { Newspaper, TrendingUp, Clock } from "lucide-react";

interface NewsItem { id: string; title: string; content: string; shortDescription: string | null; image: string | null; isTrending: boolean; createdAt: string; }

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/news")
      .then((r) => r.ok ? r.json() : [])
      .then(setNews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20"><Newspaper className="w-5 h-5 text-white" /></div>
      <div><h1 className="text-2xl font-bold text-gray-900">News</h1><p className="text-sm text-gray-500">Latest updates and announcements</p></div></div>

      {news.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Clock className="w-7 h-7 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No news yet!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Trending section */}
          {news.some((n) => n.isTrending) && (
            <div className="mb-2"><h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2"><TrendingUp className="w-4 h-4" />Trending</h3></div>
          )}
          {news.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {item.isTrending && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">Trending</span>}
                      <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{item.shortDescription || item.content.slice(0, 150)}</p>
                  </div>
                  {item.image && (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                {expandedId === item.id ? (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="prose prose-sm text-gray-700 max-w-none" dangerouslySetInnerHTML={{ __html: item.content }} />
                    <button onClick={() => setExpandedId(null)} className="mt-3 text-sky-600 text-sm font-medium hover:text-sky-700">Show less</button>
                  </div>
                ) : (
                  <button onClick={() => setExpandedId(item.id)} className="mt-3 text-sky-600 text-sm font-medium hover:text-sky-700">Read more</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
