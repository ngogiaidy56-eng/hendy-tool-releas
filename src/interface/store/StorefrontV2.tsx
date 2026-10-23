import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowRight, Boxes, CheckCircle2, ChevronDown, ExternalLink,
  FileArchive, Github, Monitor, Package, Search, ShieldCheck, Smartphone,
  Sparkles, TerminalSquare, TriangleAlert
} from 'lucide-react';

type ReleaseItem = {
  id: string;
  appName: string;
  appSlug: string;
  version: string;
  platform: string;
  fileName: string;
  sizeBytes: number | null;
  sha256: string | null;
  publishedAt: string | null;
  releaseNotes: string;
  downloadUrl: string | null;
  available: boolean;
};

const PLATFORM_LABELS: Record<string, string> = {
  windows: 'Windows',
  android: 'Android',
  ios: 'iOS',
  macos: 'macOS',
  linux: 'Linux',
  web: 'Web / Source bundle'
};

function prettySize(size: number | null): string {
  if (size === null || !Number.isFinite(size)) return 'Chưa có tệp';
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function StorefrontV2({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const [releases, setReleases] = useState<ReleaseItem[]>([]);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      setLoading(true);
      setError('');
      try {
        const responses = await Promise.all([
          fetch('/api/v1/published-releases', { headers: { Accept: 'application/json' } }),
          fetch('/api/v1/releases', { headers: { Accept: 'application/json' } })
        ]);
        const [publishedResponse, catalogResponse] = responses;
        let published: ReleaseItem[] = [];
        let catalog: ReleaseItem[] = [];
        if (publishedResponse.ok) {
          const body = await publishedResponse.json();
          published = (body.releases || []).map((item: any) => ({
            id: item.key || item.id || item.fileName,
            appName: item.appName || item.appSlug || 'Ứng dụng',
            appSlug: item.appSlug || 'app',
            version: item.version || '0.0.0',
            platform: item.platform || 'web',
            fileName: item.fileName || 'release.zip',
            sizeBytes: typeof item.sizeBytes === 'number' ? item.sizeBytes : null,
            sha256: item.sha256 || null,
            publishedAt: item.publishedAt || null,
            releaseNotes: item.releaseNotes || 'Bản phát hành đã tải lên kho R2.',
            downloadUrl: item.downloadUrl || null,
            available: Boolean(item.downloadUrl)
          }));
        }
        if (catalogResponse.ok) {
          const body = await catalogResponse.json();
          catalog = (body.releases || []).map((item: any) => ({
            id: 'catalog-' + item.platform + '-' + item.version,
            appName: 'Hendy Tools Pro',
            appSlug: 'hendy-tools-pro',
            version: item.version,
            platform: item.platform,
            fileName: item.fileName,
            sizeBytes: typeof item.fileSizeBytes === 'number' ? item.fileSizeBytes : null,
            sha256: item.sha256 || null,
            publishedAt: item.publishedAt || null,
            releaseNotes: item.releaseNotes || '',
            downloadUrl: item.downloadUrl || null,
            available: Boolean(item.available && item.downloadUrl)
          }));
        }
        if (active) {
          const combined = published.concat(catalog).filter((item, index, all) =>
            all.findIndex((candidate) => candidate.fileName === item.fileName && candidate.version === item.version) === index
          );
          setReleases(combined);
          if (responses.every((response) => !response.ok)) setError('API kho phát hành chưa phản hồi thành công. Bạn vẫn có thể mở trang quản trị để kiểm tra cấu hình.');
        }
      } catch {
        if (active) setError('Không kết nối được API kho ứng dụng. Vui lòng thử tải lại trang.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCatalog();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => releases.filter((item) => {
    const text = (item.appName + ' ' + item.fileName + ' ' + item.releaseNotes + ' ' + item.platform).toLowerCase();
    return text.includes(query.toLowerCase()) && (platform === 'all' || item.platform === platform);
  }), [releases, query, platform]);

  const availableCount = releases.filter((release) => release.available).length;

  return (
    <div className="store-shell min-h-screen bg-[#f7f8fa] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 lg:px-10">
          <a href="/" className="flex items-center gap-3 no-underline" aria-label="Hendy Store home">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300">
              <Boxes size={23} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight">hendy<span className="text-indigo-600">/</span>store</span>
              <span className="block text-[11px] font-medium tracking-wide text-slate-500">APP CATALOG · RELEASE CHANNEL</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a className="hover:text-slate-950" href="#catalog">Kho ứng dụng</a>
            <a className="hover:text-slate-950" href="#release-process">Quy trình phát hành</a>
            <a className="hover:text-slate-950" href="https://github.com/ngogiaidy56-eng/hendy-tool-releas" target="_blank" rel="noreferrer">Mã nguồn <ExternalLink size={13} className="ml-1 inline" /></a>
          </nav>
          <button onClick={onOpenAdmin} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
            Studio quản trị <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div className="absolute -right-24 -top-36 h-[450px] w-[450px] rounded-full bg-indigo-100/70 blur-3xl" />
          <div className="absolute right-[25%] top-24 h-40 w-40 rounded-full bg-cyan-100/70 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 py-16 lg:grid-cols-[1.2fr_.8fr] lg:px-10 lg:py-24">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[.13em] text-indigo-700">
                <Sparkles size={14} /> Software release platform
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.04] tracking-[-.045em] sm:text-6xl lg:text-7xl">
                Ứng dụng của bạn.
                <span className="block text-indigo-600">Một nơi phát hành.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Khám phá gói phát hành, xem phiên bản và tải xuống tệp thực đã được xuất bản. Mỗi mục chỉ bật nút tải khi kho lưu trữ xác nhận có tệp.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#catalog" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">
                  Khám phá bản phát hành <ArrowRight size={17} />
                </a>
                <button onClick={onOpenAdmin} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:border-slate-400">
                  <TerminalSquare size={17} /> Đóng gói ứng dụng
                </button>
              </div>
              <div className="mt-12 grid max-w-xl grid-cols-3 gap-5 border-t border-slate-200 pt-6">
                <div><strong className="block text-2xl font-black">{releases.length}</strong><span className="text-xs text-slate-500">Gói trong danh mục</span></div>
                <div><strong className="block text-2xl font-black text-emerald-600">{availableCount}</strong><span className="text-xs text-slate-500">Tệp tải đã sẵn sàng</span></div>
                <div><strong className="block text-2xl font-black">SHA-256</strong><span className="text-xs text-slate-500">Đối soát tệp</span></div>
              </div>
            </div>
            <div className="self-center">
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-3 shadow-2xl shadow-slate-200/70">
                <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white sm:p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-400"/><i className="h-2.5 w-2.5 rounded-full bg-amber-300"/><i className="h-2.5 w-2.5 rounded-full bg-emerald-400"/></div>
                    <span className="font-mono text-[10px] text-slate-500">RELEASE CONTROL</span>
                  </div>
                  <div className="mt-8 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500"><Package size={28}/></div>
                    <div><div className="text-lg font-bold">Release package</div><div className="text-xs text-slate-400">Manifest · Hash · Artifact</div></div>
                  </div>
                  <div className="mt-7 space-y-3">
                    {[['Artifact storage','R2 Object Storage'],['Integrity check','SHA-256'],['Distribution','Worker Edge API']].map((item) => (
                      <div key={item[0]} className="flex items-center justify-between border-b border-white/10 pb-3 text-sm">
                        <span className="text-slate-400">{item[0]}</span><span className="flex items-center gap-2 font-medium"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>{item[1]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-xl border border-white/10 bg-white/[.04] p-3 font-mono text-xs leading-6 text-slate-300">
                    <span className="text-emerald-400">✓</span> Verify metadata from API<br/>
                    <span className="text-emerald-400">✓</span> Download only when artifact exists<br/>
                    <span className="text-amber-300">•</span> Native signing stays in CI/toolchain
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="catalog" className="mx-auto max-w-[1440px] px-5 py-14 lg:px-10 lg:py-20">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Release catalog</div>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Kho bản phát hành</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Danh sách lấy từ API của Worker và kho R2. Dữ liệu cấu hình mẫu không được coi là gói tải thật.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex min-w-64 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                <Search size={17} className="text-slate-400"/>
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Tìm ứng dụng hoặc tên tệp"/>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                <ChevronDown size={16} className="text-slate-400"/>
                <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="bg-transparent text-sm outline-none">
                  <option value="all">Mọi nền tảng</option>
                  {Object.entries(PLATFORM_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {error && <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><TriangleAlert size={18} className="mt-0.5 shrink-0"/><p>{error}</p></div>}

          {loading ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1,2,3].map((item) => <div key={item} className="h-60 animate-pulse rounded-3xl border border-slate-200 bg-white"/>)}
            </div>
          ) : filtered.length ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <article key={item.id} className="group flex min-h-[270px] flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/60">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">{item.platform === 'android' || item.platform === 'ios' ? <Smartphone size={22}/> : <Monitor size={22}/>}</div>
                    <span className={'rounded-full px-3 py-1 text-[11px] font-bold ' + (item.available ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                      {item.available ? 'Có tệp tải thật' : 'Chưa có artifact'}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold tracking-tight">{item.appName}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>v{item.version.replace(/^v/, '')}</span><span>·</span><span>{PLATFORM_LABELS[item.platform] || item.platform}</span></div>
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{item.releaseNotes || item.fileName}</p>
                  <div className="mt-5 rounded-xl bg-slate-50 p-3">
                    <div className="truncate text-xs font-semibold text-slate-700">{item.fileName}</div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500"><span>{prettySize(item.sizeBytes)}</span><span>{item.sha256 ? 'SHA-256 available' : 'Chưa có checksum'}</span></div>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="text-xs text-slate-500">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('vi-VN') : 'Chưa phát hành'}</span>
                    {item.available && item.downloadUrl ? (
                      <a href={item.downloadUrl} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"><ArrowDownToLine size={15}/> Tải xuống</a>
                    ) : (
                      <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-400"><ArrowDownToLine size={15}/> Chưa sẵn sàng</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><FileArchive size={25}/></div>
              <h3 className="mt-5 text-xl font-extrabold">Chưa có bản phát hành phù hợp</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Tải mã nguồn vào Studio, tạo gói phát hành, rồi xuất bản lên R2. Những bản chưa có tệp thật sẽ không có nút tải hoạt động.</p>
              <button onClick={onOpenAdmin} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Mở Studio <ArrowRight size={16}/></button>
            </div>
          )}
        </section>

        <section id="release-process" className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:grid-cols-3 lg:px-10">
            {[
              { icon: FileArchive, title: 'Đóng gói', text: 'Tạo ZIP có mã nguồn, manifest phát hành và checksum SHA-256 thực.' },
              { icon: ShieldCheck, title: 'Kiểm tra', text: 'Đối soát metadata từ R2; ký số native phải được thực hiện bởi toolchain tương ứng.' },
              { icon: ArrowDownToLine, title: 'Phân phối', text: 'Bản đã xuất bản được phân phối qua API và địa chỉ tải xuống của Worker.' }
            ].map((item) => {
              const Icon = item.icon;
              return <div key={item.title} className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Icon size={21}/></div><div><h3 className="font-extrabold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p></div></div>;
            })}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-3 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:items-center lg:px-10">
        <div>© 2026 Hendy Store · Release catalog</div>
        <div className="flex flex-wrap items-center gap-4"><span className="flex items-center gap-1.5"><CheckCircle2 size={14}/> Trạng thái tải lấy từ API</span><a href="https://github.com/ngogiaidy56-eng/hendy-tool-releas" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-600"><Github size={14}/> GitHub</a><button onClick={onOpenAdmin} className="font-semibold text-slate-700 hover:text-indigo-600">Studio quản trị</button></div>
      </footer>
    </div>
  );
}
