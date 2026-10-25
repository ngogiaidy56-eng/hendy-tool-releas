import { useCallback, useEffect, useState } from 'react';
import { Activity, ExternalLink, Github, RefreshCw, ShieldCheck, Store, Wrench } from 'lucide-react';

const USER_PAGE = 'https://hendy-web-user.pages.dev';
const ADMIN_PAGE = 'https://hendy-web-admin.pages.dev';
const OPS_PAGE = 'https://hendy-operations.pages.dev';
const REPO = 'https://github.com/ngogiaidy56-eng/hendy-tool-releas';
const WORKFLOW = REPO + '/actions/workflows/deploy-cloudflare.yml';

type Status = { label: string; ok: boolean | null; detail: string };
type Readiness = { success?: boolean; ready?: boolean; adminReady?: boolean; missing?: string[]; checks?: Record<string, boolean> };

export default function OperationsConsole() {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [busy, setBusy] = useState(false);
  const [checkedAt, setCheckedAt] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const [healthRes, readyRes, metaRes] = await Promise.all([
        fetch('/api/v1/runtime/health', { cache: 'no-store' }),
        fetch('/api/v1/runtime/readiness', { cache: 'no-store' }),
        fetch('/api/v1/meta', { cache: 'no-store' }),
      ]);
      const health = await healthRes.json().catch(() => ({}));
      const ready: Readiness = await readyRes.json().catch(() => ({}));
      const meta = await metaRes.json().catch(() => ({}));
      setStatuses([
        { label: 'Worker API', ok: healthRes.ok && health.status === 'healthy', detail: healthRes.ok ? 'Health endpoint phản hồi' : 'HTTP ' + healthRes.status },
        { label: 'Release storage / R2', ok: ready.checks?.releaseStorage === true, detail: ready.checks?.releaseStorage ? 'Binding đã sẵn sàng' : 'Kiểm tra binding R2 trong Cloudflare' },
        { label: 'Admin Access', ok: ready.checks?.adminAccess === true, detail: ready.checks?.adminAccess ? 'Cấu hình xác thực đã liên kết' : 'Cần kiểm tra Cloudflare Access' },
        { label: 'CI publisher', ok: ready.checks?.ciPublisher === true, detail: ready.checks?.ciPublisher ? 'Publisher secret đã cấu hình' : 'Cần cấu hình publisher secret' },
        { label: 'API metadata', ok: metaRes.ok && meta.success !== false, detail: metaRes.ok ? 'Metadata endpoint phản hồi' : 'HTTP ' + metaRes.status },
      ]);
      if (!readyRes.ok || ready.success !== true) setError('Không đọc được đầy đủ trạng thái runtime. Kiểm tra Worker và cấu hình Cloudflare.');
      else if (ready.missing?.length) setError('Runtime còn thiếu: ' + ready.missing.join(', '));
      setCheckedAt(new Date().toLocaleString('vi-VN'));
    } catch {
      setError('Không kết nối được API. Kiểm tra DNS, deployment và trạng thái Cloudflare.');
      setStatuses([{ label: 'Worker API', ok: false, detail: 'Không thể kết nối' }]);
      setCheckedAt(new Date().toLocaleString('vi-VN'));
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  const cards = [
    { title: 'Web User', desc: 'Giao diện công khai để khám phá và tải bản phát hành.', url: USER_PAGE, icon: Store },
    { title: 'Web Admin', desc: 'Bảng quản trị riêng, yêu cầu đăng nhập Cloudflare Access.', url: ADMIN_PAGE, icon: ShieldCheck },
    { title: 'Operations', desc: 'Trang này: theo dõi runtime và mở quy trình CI/CD.', url: OPS_PAGE, icon: Activity },
  ];

  return <main className="ops-shell">
    <header className="ops-header"><div className="ops-brand"><div className="ops-logo"><Wrench size={21}/></div><div><span className="ops-eyebrow">HENDY PLATFORM</span><h1>Operations Center</h1></div></div><button className="ops-refresh" onClick={() => void refresh()} disabled={busy}><RefreshCw size={16} className={busy ? 'spin' : ''}/>{busy ? 'Đang kiểm tra…' : 'Kiểm tra lại'}</button></header>
    <section className="ops-hero"><div><span className="ops-eyebrow">CLOUD CONTROL PLANE</span><h2>Vận hành toàn bộ hệ thống</h2><p>Một điểm điều phối cho ba Cloudflare Pages, Worker API, kiểm tra runtime và quy trình phát hành. Trang này không hiển thị hay lưu giá trị bí mật.</p></div><a className="ops-primary" href={WORKFLOW} target="_blank" rel="noreferrer"><Github size={18}/> Mở workflow triển khai <ExternalLink size={15}/></a></section>
    <section className="ops-section"><div className="ops-section-title"><h3>Các Pages độc lập</h3><span>3 ứng dụng · 1 backend Worker</span></div><div className="ops-grid">{cards.map(({title, desc, url, icon: Icon}) => <a className="ops-card" href={url} key={title} target="_blank" rel="noreferrer"><div className="ops-card-icon"><Icon size={20}/></div><div><h4>{title}</h4><p>{desc}</p><code>{url.replace('https://','')}</code></div><ExternalLink className="ops-external" size={16}/></a>)}</div></section>
    <section className="ops-section"><div className="ops-section-title"><h3>Trạng thái runtime</h3><span>{checkedAt ? 'Cập nhật: ' + checkedAt : 'Chưa kiểm tra'}</span></div>{error && <div className="ops-alert">{error}</div>}<div className="ops-status-grid">{statuses.map((item) => <div className="ops-status" key={item.label}><span className={'ops-dot ' + (item.ok === null ? 'unknown' : item.ok ? 'good' : 'bad')}/><div><strong>{item.label}</strong><p>{item.detail}</p></div><b>{item.ok === null ? '—' : item.ok ? 'OK' : 'CHECK'}</b></div>)}</div></section>
    <section className="ops-section ops-actions"><div className="ops-section-title"><h3>Quản trị mã nguồn</h3><span>GitHub là nguồn phát hành</span></div><a href={REPO} target="_blank" rel="noreferrer"><Github size={18}/> Repository <ExternalLink size={14}/></a><a href={WORKFLOW} target="_blank" rel="noreferrer"><Activity size={18}/> Deploy Worker + 3 Pages <ExternalLink size={14}/></a><a href={REPO + '/actions/workflows/verify-store-admin.yml'} target="_blank" rel="noreferrer"><ShieldCheck size={18}/> Kiểm tra build và bảo mật <ExternalLink size={14}/></a><a href="https://dash.cloudflare.com/" target="_blank" rel="noreferrer"><Wrench size={18}/> Cloudflare Dashboard <ExternalLink size={14}/></a></section>
    <footer className="ops-footer">Hendy Tools · Cloudflare Pages + Workers · Không có secret nào được đưa xuống trình duyệt.</footer>
  </main>;
}
