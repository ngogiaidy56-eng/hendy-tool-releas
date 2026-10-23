/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ShieldCheck, Download, Star, Sparkles, Filter, Cloud, ExternalLink, Laptop, Smartphone } from 'lucide-react';
import { ProjectTemplate, BuildArtifact } from '../../types/index.ts';
import { AppCard } from './AppCard.tsx';
import { AppDetailModal } from './AppDetailModal.tsx';
import { WebAssemblyRunner } from './WebAssemblyRunner.tsx';

interface AppStoreViewProps {
  apps: ProjectTemplate[];
  onOpenDriveModal?: () => void;
  onRequestAdminAccess?: () => void;
}

export const AppStoreView: React.FC<AppStoreViewProps> = ({
  apps,
  onOpenDriveModal,
  onRequestAdminAccess,
}) => {
  const [selectedApp, setSelectedApp] = useState<ProjectTemplate | null>(null);
  const [sandboxApp, setSandboxApp] = useState<ProjectTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'Tất cả ứng dụng' },
    { id: 'Developer Tools', name: 'Công cụ Lập trình' },
    { id: 'Security & Terminal', name: 'Bảo mật & Terminal' },
    { id: 'Creative & Design', name: 'Thiết kế Sáng tạo' },
    { id: 'Cloud & Storage', name: 'Lưu trữ & Mạng' },
  ];

  const featuredApp = apps.find((a) => a.id === 'hendy-tools-pro') || apps[0];

  const filteredApps = apps.filter((app) => {
    const matchQuery =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'all' || app.category === selectedCategory;
    const matchPlatform =
      selectedPlatform === 'all' ||
      app.platforms.some((p) => p.platform === selectedPlatform && p.enabled);
    return matchQuery && matchCategory && matchPlatform;
  });

  const handleQuickDownload = (app: ProjectTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedApp(app);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100">
      {/* Consumer App Store Top Bar (Zone 1: Wordmark, Zone 2: Search & Categories, Zone 3: Google Drive & Admin Access) */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            H
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 tracking-tight leading-none">
              Hendy App Store
            </h1>
            <p className="text-[11px] text-slate-400">Kho ứng dụng & Bộ cài đặt chính thức</p>
          </div>
        </div>

        {/* Zone 2: Search */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm ứng dụng, công cụ, tiện ích..."
              className="bg-transparent text-slate-200 outline-none w-full placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">hendytools.pages.dev</span>
          </div>

          {onRequestAdminAccess && (
            <button
              type="button"
              onClick={onRequestAdminAccess}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all shadow-xs"
              title="Truy cập Bảng điều khiển Quản trị viên Server Plus"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Quản trị viên</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 flex flex-col gap-8">
        {/* Mobile Search */}
        <div className="sm:hidden">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm ứng dụng..."
              className="bg-transparent text-slate-200 outline-none w-full"
            />
          </div>
        </div>

        {/* Featured Hero Banner */}
        {featuredApp && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/40 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>TIÊU ĐIỂM HÔM NAY · BỘ CÔNG CỤ ĐA NỀN TẢNG</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                {featuredApp.name} {featuredApp.currentVersion.startsWith('v') ? featuredApp.currentVersion : `v${featuredApp.currentVersion}`}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                {featuredApp.description}
              </p>

              {/* Clean metadata without pill boxes */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-6">
                <div className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{featuredApp.storeMeta.rating}</span>
                </div>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{featuredApp.storeMeta.downloadsCount} lượt cài đặt</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Chứng thư số Authenticode EV
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedApp(featuredApp)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải về ngay ({featuredApp.releases[0]?.artifacts[0]?.format || '.exe'})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSandboxApp(featuredApp)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  <span>Chạy thử WebAssembly Sandbox</span>
                </button>
              </div>
            </div>

            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-4xl shadow-xl shrink-0">
              {featuredApp.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>Hệ điều hành:</span>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 outline-none text-xs"
            >
              <option value="all">Tất cả hệ điều hành</option>
              <option value="windows">Windows (.exe)</option>
              <option value="android">Android (.apk)</option>
              <option value="ios">iOS (.ipa)</option>
              <option value="macos">macOS (.dmg)</option>
            </select>
          </div>
        </div>

        {/* App Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredApps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              onSelect={(a) => setSelectedApp(a)}
              onQuickDownload={(a, e) => handleQuickDownload(a, e)}
            />
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            Không tìm thấy ứng dụng nào khớp với tiêu chí tìm kiếm của bạn.
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 sm:px-8 mt-auto text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <span>© 2026 Hendy Tools Platform. Bản quyền được bảo lưu.</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% An toàn & Không mã độc
          </span>
          <span>·</span>
          <span>Xác thực bởi Authenticode EV</span>
        </div>
      </footer>

      {/* Modals */}
      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onOpenSandbox={() => {
            setSandboxApp(selectedApp);
          }}
        />
      )}

      {sandboxApp && (
        <WebAssemblyRunner app={sandboxApp} onClose={() => setSandboxApp(null)} />
      )}
    </div>
  );
};
