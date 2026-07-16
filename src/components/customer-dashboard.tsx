"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Gift,
  HelpCircle,
  Home,
  Info,
  LockKeyhole,
  Menu,
  Palette,
  ReceiptText,
  ShieldCheck,
  Shirt,
  Sparkles,
  Store,
  Trophy,
  UsersRound,
  WandSparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  activity,
  benefits,
  formatter,
  nonStackableDiscounts,
  savingsData,
  stackableOffers,
  tiers,
} from "@/lib/tier-data";

const iconMap: Record<string, LucideIcon> = {
  palette: Palette,
  wand: WandSparkles,
  zap: Zap,
  store: Store,
  calendar: CalendarDays,
  shirt: Shirt,
};

const navItems = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "benefits", label: "My benefits", icon: Gift },
  { id: "discounts", label: "Discount wallet", icon: CircleDollarSign },
  { id: "reseller", label: "Reseller program", icon: UsersRound },
  { id: "activity", label: "Activity", icon: ReceiptText },
];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const currentSpend = 1640;
const currentTier = tiers[1];
const nextTier = tiers[2];
const protectedThrough = "December 31, 2027";

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function StatusPill({ children, tone = "teal" }: { children: React.ReactNode; tone?: "teal" | "yellow" | "neutral" }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

export default function CustomerDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [expandedBenefit, setExpandedBenefit] = useState<string | null>("artwork");
  const [selectedDiscount, setSelectedDiscount] = useState("new-business");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resellerChecks, setResellerChecks] = useState({ license: true, decorator: true, spend: true });
  const [resellerStatus, setResellerStatus] = useState<"draft" | "submitted">("draft");

  const nextTierRemaining = nextTier.threshold - currentSpend;
  const progressInBand = Math.min(
    100,
    ((currentSpend - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100,
  );
  const completedReseller = Object.values(resellerChecks).filter(Boolean).length;

  const currentDiscount = useMemo(
    () => nonStackableDiscounts.find((discount) => discount.id === selectedDiscount),
    [selectedDiscount],
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function goToSection(id: string) {
    setActiveSection(id);
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#main-content">
        Skip to dashboard
      </a>

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`} aria-label="Account navigation">
        <div className="sidebar-brand">
          <Image src={`${basePath}/onward-logo.png`} alt="Onward Customs" width={176} height={48} priority />
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <div className="account-chip">
          <div className="avatar">KS</div>
          <div>
            <strong>Kelvin Studios</strong>
            <span>Customer account</span>
          </div>
          <ChevronDown size={16} aria-hidden="true" />
        </div>

        <nav className="sidebar-nav">
          <span className="nav-label">Rewards dashboard</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activeSection === item.id ? "nav-item nav-item-active" : "nav-item"}
                onClick={() => goToSection(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === "discounts" ? <span className="nav-count">3</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="support-card">
            <div className="support-icon"><HelpCircle size={20} /></div>
            <strong>Need a hand?</strong>
            <p>Our team can help explain your tier or benefits.</p>
            <a href="mailto:contact@onwardcustoms.com">Contact support <ArrowRight size={14} /></a>
          </div>
          <span className="secure-note"><LockKeyhole size={14} /> Rewards data is account protected</span>
        </div>
      </aside>

      {mobileOpen ? <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}

      <div className="dashboard-main-wrap">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>My account</span>
            <ChevronRight size={14} />
            <strong>Rewards</strong>
          </div>
          <div className="topbar-actions">
            <a className="text-link topbar-help" href="mailto:contact@onwardcustoms.com"><HelpCircle size={17} /> Help</a>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => notify("You’re all caught up — no new notifications.")}>
              <Bell size={19} />
              <span aria-hidden="true" />
            </button>
            <button className="profile-button" onClick={() => notify("Account settings will connect in the live version.")}>
              <div className="mini-avatar">KS</div>
              <span>Kelvin</span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

        <main id="main-content" className="dashboard-content">
          <section id="overview" className="content-section hero-section">
            <div className="welcome-line">
              <div>
                <span className="eyebrow">Thursday, July 16</span>
                <h1>Welcome back, Kelvin.</h1>
                <p>Here’s how your Onward relationship is growing.</p>
              </div>
              <a className="primary-button desktop-order" href="https://onwardcustoms.com/create" target="_blank" rel="noreferrer">
                Start an order <ArrowRight size={17} />
              </a>
            </div>

            <div className="tier-hero">
              <div className="tier-hero-main">
                <div className="hero-glow hero-glow-one" />
                <div className="hero-glow hero-glow-two" />
                <div className="current-tier-row">
                  <div className="tier-medallion"><Trophy size={27} /></div>
                  <div>
                    <span className="hero-label">Your current tier</span>
                    <h2>Onward Plus <em>Bronze</em></h2>
                  </div>
                  <StatusPill tone="yellow"><BadgeCheck size={14} /> Active</StatusPill>
                </div>

                <div className="hero-progress-copy">
                  <div>
                    <span>2026 qualifying spend</span>
                    <strong>{formatter.format(currentSpend)}</strong>
                  </div>
                  <div className="progress-target">
                    <span>{formatter.format(nextTierRemaining)} to Silver</span>
                    <b>{Math.round(progressInBand)}%</b>
                  </div>
                </div>
                <div className="hero-progress-track" aria-label={`${Math.round(progressInBand)} percent to Silver`}>
                  <motion.span initial={{ width: 0 }} animate={{ width: `${progressInBand}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
                </div>
                <div className="hero-progress-labels">
                  <span>Bronze · $500</span>
                  <span>Silver · $2,500</span>
                </div>
                <p className="protected-copy"><ShieldCheck size={16} /> Your Bronze status is protected through <strong>{protectedThrough}</strong>.</p>
              </div>

              <div className="tier-hero-side">
                <span className="hero-label">Benefits at a glance</span>
                <div className="glance-stat">
                  <strong>1.5</strong>
                  <span>artwork hours remaining</span>
                </div>
                <div className="glance-grid">
                  <div><Zap size={17} /><strong>10%</strong><span>off rush fees</span></div>
                  <div><Store size={17} /><strong>50%</strong><span>off webstores</span></div>
                </div>
                <button className="hero-link" onClick={() => goToSection("benefits")}>Explore all benefits <ArrowRight size={15} /></button>
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-icon yellow"><CircleDollarSign size={20} /></span>
                <div><span>Saved this year</span><strong>$159</strong><small>Across 4 qualifying orders</small></div>
                <span className="trend">+18%</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon teal"><Gift size={20} /></span>
                <div><span>Available credit</span><strong>$50</strong><small>From one completed referral</small></div>
                <ChevronRight size={18} />
              </div>
              <div className="stat-card">
                <span className="stat-icon dark"><Clock3 size={20} /></span>
                <div><span>Next annual reset</span><strong>Jan 1</strong><small>Artwork and program benefits</small></div>
                <ChevronRight size={18} />
              </div>
            </div>
          </section>

          <section className="content-section tier-journey-section" aria-labelledby="tier-journey-title">
            <SectionHeading
              eyebrow="Your tier journey"
              title="Every order moves you onward."
              description="Only eligible purchases placed through Onward Customs count toward annual tier spend."
              action={<button className="secondary-button" onClick={() => setSelectedTier("comparison")}>Compare all tiers</button>}
            />
            <div className="tier-track-card">
              <div className="tier-track-line"><motion.span initial={{ width: 0 }} animate={{ width: `${(currentSpend / 5000) * 100}%` }} transition={{ duration: 1.1 }} /></div>
              <div className="tier-nodes">
                {tiers.map((tier, index) => {
                  const achieved = currentSpend >= tier.threshold;
                  const isCurrent = tier.id === currentTier.id;
                  return (
                    <button key={tier.id} className={`tier-node ${achieved ? "achieved" : ""} ${isCurrent ? "current" : ""}`} onClick={() => setSelectedTier(tier.id)}>
                      <span className="node-marker" style={{ "--tier-accent": tier.accent } as React.CSSProperties}>
                        {achieved ? <Check size={18} /> : <LockKeyhole size={15} />}
                      </span>
                      <strong>{tier.shortName}</strong>
                      <small>{tier.threshold === 0 ? "First order" : formatter.format(tier.threshold)}</small>
                      {isCurrent ? <em>You are here</em> : index === 2 ? <em className="next-label">Next</em> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="benefits" className="content-section" aria-labelledby="benefits-title">
            <SectionHeading
              eyebrow="Benefit wallet"
              title="Built-in value, ready when you are."
              description="Track the benefits included with your current Bronze tier."
              action={<button className="text-link" onClick={() => setSelectedTier("comparison")}>View all tier benefits <ArrowRight size={15} /></button>}
            />
            <div className="benefit-grid">
              {benefits.map((benefit) => {
                const Icon = iconMap[benefit.icon];
                const open = expandedBenefit === benefit.id;
                const percentage = benefit.total ? Math.min(100, (benefit.used / benefit.total) * 100) : null;
                return (
                  <motion.article layout key={benefit.id} className={`benefit-card ${open ? "benefit-card-open" : ""}`}>
                    <button className="benefit-summary" onClick={() => setExpandedBenefit(open ? null : benefit.id)} aria-expanded={open}>
                      <span className="benefit-icon"><Icon size={21} /></span>
                      <span className="benefit-title"><small>{benefit.category}</small><strong>{benefit.title}</strong></span>
                      <ChevronDown size={18} className={open ? "rotate" : ""} />
                    </button>
                    <div className="benefit-meter-copy">
                      {benefit.total ? (
                        <><strong>{benefit.total - benefit.used} {benefit.unit} remaining</strong><span>{benefit.used} used</span></>
                      ) : (
                        <><strong>{benefit.unit}</strong><StatusPill><Check size={13} /> Included</StatusPill></>
                      )}
                    </div>
                    {percentage !== null ? <div className="mini-meter"><span style={{ width: `${percentage}%` }} /></div> : null}
                    <AnimatePresence initial={false}>
                      {open ? (
                        <motion.div className="benefit-detail" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <p>{benefit.detail}</p>
                          <button onClick={() => notify(`${benefit.title}: request started in prototype mode.`)}>{benefit.action} <ArrowRight size={14} /></button>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
            </div>
          </section>

          <section id="discounts" className="content-section" aria-labelledby="discounts-title">
            <SectionHeading
              eyebrow="Discount wallet"
              title="Your best savings, clearly explained."
              description="Non-stackable discounts never combine. We’ll apply one eligible option per order."
            />
            <div className="discount-layout">
              <div className="discount-main-card">
                <div className="discount-header">
                  <span className="discount-icon"><CircleDollarSign size={23} /></span>
                  <div><span className="hero-label">Selected non-stackable discount</span><h3>{currentDiscount?.name}</h3></div>
                  <div className="discount-value">{currentDiscount?.value}% <small>off</small></div>
                </div>
                <div className="rule-banner"><Info size={17} /><p>This is currently your best verified discount. It cannot be combined with another non-stackable tier or eligibility discount.</p></div>
                <div className="discount-options" role="radiogroup" aria-label="Select one non-stackable discount">
                  {nonStackableDiscounts.map((discount) => (
                    <label key={discount.id} className={selectedDiscount === discount.id ? "discount-option selected" : "discount-option"}>
                      <input type="radio" name="discount" value={discount.id} checked={selectedDiscount === discount.id} onChange={() => setSelectedDiscount(discount.id)} />
                      <span className="radio-control"><Check size={13} /></span>
                      <span><strong>{discount.name} · {discount.value}%</strong><small>{discount.description}</small></span>
                      {discount.status === "verified" ? <StatusPill><BadgeCheck size={13} /> Verified</StatusPill> : <span className="verify-label">Verify</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div className="stackable-card">
                <div className="stackable-heading"><div><span className="eyebrow">Can be added</span><h3>Stackable savings</h3></div><Sparkles size={22} /></div>
                {stackableOffers.map((offer) => (
                  <div className="stackable-row" key={offer.id}>
                    <div><strong>{offer.name}</strong><span>{offer.description}</span></div>
                    <b>{offer.value}</b>
                  </div>
                ))}
                <button className="secondary-button full-width" onClick={() => notify("Savings example opened in prototype mode.")}>See a savings example</button>
              </div>
            </div>
          </section>

          <section id="reseller" className="content-section" aria-labelledby="reseller-title">
            <div className="reseller-card">
              <div className="reseller-intro">
                <span className="reseller-icon"><Building2 size={26} /></span>
                <span className="eyebrow">Separate qualification track</span>
                <h2 id="reseller-title">Are you an apparel reseller or decorator?</h2>
                <p>Complete any two requirements to apply for reseller-only tools, training and qualifying production savings.</p>
                <div className="reseller-progress"><strong>{completedReseller} of 3 complete</strong><span>Two are required</span></div>
                <div className="reseller-mini-track"><span style={{ width: `${(completedReseller / 3) * 100}%` }} /></div>
              </div>
              <div className="reseller-checklist">
                {[
                  ["license", "Reseller documentation", "Provide a state reseller license or equivalent letterhead."],
                  ["decorator", "Industry decorator", "Confirm that you operate in the custom-apparel industry."],
                  ["spend", "$250 annual spend", "Automatically verified from eligible Onward Customs purchases."],
                ].map(([id, title, description]) => {
                  const checked = resellerChecks[id as keyof typeof resellerChecks];
                  return (
                    <button key={id} className={checked ? "reseller-check checked" : "reseller-check"} onClick={() => setResellerChecks((state) => ({ ...state, [id]: !checked }))}>
                      <span className="check-box">{checked ? <Check size={16} /> : null}</span>
                      <span><strong>{title}</strong><small>{description}</small></span>
                      {id === "spend" && checked ? <StatusPill><BadgeCheck size={13} /> Verified</StatusPill> : null}
                    </button>
                  );
                })}
                <button
                  className="primary-button full-width"
                  disabled={completedReseller < 2 || resellerStatus === "submitted"}
                  onClick={() => { setResellerStatus("submitted"); notify("Reseller application submitted for review."); }}
                >
                  {resellerStatus === "submitted" ? <><CheckCircle2 size={17} /> Application submitted</> : <>Continue application <ArrowRight size={17} /></>}
                </button>
                <p className="fine-print"><ShieldCheck size={14} /> Documents will be handled securely in the connected production version.</p>
              </div>
            </div>
          </section>

          <section id="activity" className="content-section" aria-labelledby="activity-title">
            <SectionHeading
              eyebrow="Activity & savings"
              title="See what counted—and what you saved."
              description="Only eligible Onward Customs orders contribute to your tier progress."
              action={<button className="secondary-button" onClick={() => notify("A full activity export will be available with live account data.")}>Export activity</button>}
            />
            <div className="activity-layout">
              <div className="chart-card">
                <div className="chart-header"><div><span>Savings this year</span><strong>$159</strong></div><StatusPill tone="yellow">+18% vs. last year</StatusPill></div>
                <div className="chart-wrap" aria-label="Monthly savings chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={savingsData} margin={{ top: 10, right: 0, left: -22, bottom: 0 }}>
                      <defs><linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFC500" stopOpacity={0.45} /><stop offset="100%" stopColor="#FFC500" stopOpacity={0.02} /></linearGradient></defs>
                      <CartesianGrid vertical={false} stroke="#E8E8E8" strokeDasharray="3 3" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#737373", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#737373", fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                      <Tooltip contentStyle={{ border: "1px solid #E6E6E6", borderRadius: 12, boxShadow: "0 12px 30px rgba(0,0,0,.08)" }} formatter={(value) => [`$${value}`, "Savings"]} />
                      <Area type="monotone" dataKey="savings" stroke="#242424" strokeWidth={2.5} fill="url(#savingsFill)" activeDot={{ r: 5, fill: "#FFC500", stroke: "#242424", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="activity-list-card">
                <div className="list-card-heading"><h3>Recent qualifying orders</h3><button className="text-link" onClick={() => notify("All qualifying orders will load with live account data.")}>View all</button></div>
                <div className="activity-list">
                  {activity.map((item) => (
                    <button className="activity-row" key={item.order} onClick={() => notify(`${item.order}: order details opened in prototype mode.`)}>
                      <span className="order-icon"><ReceiptText size={18} /></span>
                      <span className="order-copy"><strong>{item.title}</strong><small>{item.order} · {item.date}</small></span>
                      <span className="order-value"><strong>{formatter.format(item.spend)}</strong><small>+{formatter.format(item.savings)} saved</small></span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="content-section cta-section">
            <div><span className="eyebrow">Keep moving onward</span><h2>You’re {formatter.format(nextTierRemaining)} away from Silver.</h2><p>Your next eligible order can unlock stronger savings, more artwork time and premium account benefits.</p></div>
            <a className="primary-button" href="https://onwardcustoms.com/create" target="_blank" rel="noreferrer">Start your next order <ArrowRight size={17} /></a>
          </section>
        </main>
      </div>

      <AnimatePresence>
        {toast ? (
          <motion.div className="toast" role="status" initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}>
            <CheckCircle2 size={19} /> {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTier ? (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setSelectedTier(null)}>
            <motion.div className="tier-modal" role="dialog" aria-modal="true" aria-label="Tier details" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.98 }} onMouseDown={(event) => event.stopPropagation()}>
              <button className="icon-button modal-close" onClick={() => setSelectedTier(null)} aria-label="Close tier details"><X size={20} /></button>
              <span className="eyebrow">Tier comparison</span>
              <h2>{selectedTier === "comparison" ? "Compare Onward tiers" : tiers.find((tier) => tier.id === selectedTier)?.name}</h2>
              <p className="modal-intro">Benefits build as your eligible annual Onward Customs spend grows.</p>
              <div className="comparison-grid">
                {tiers.map((tier) => (
                  <article key={tier.id} className={`comparison-card ${tier.id === currentTier.id ? "comparison-current" : ""}`}>
                    <span className="comparison-accent" style={{ background: tier.accent }} />
                    <small>{tier.threshold === 0 ? "Place one order" : `${formatter.format(tier.threshold)} annual spend`}</small>
                    <h3>{tier.shortName}</h3>
                    <p>{tier.description}</p>
                    {tier.discount ? <strong className="comparison-discount">{tier.discount}% order discount*</strong> : null}
                    <ul>{tier.benefits.slice(0, 4).map((benefit) => <li key={benefit}><Check size={14} /> {benefit}</li>)}</ul>
                    {tier.id === currentTier.id ? <StatusPill tone="yellow">Your tier</StatusPill> : null}
                  </article>
                ))}
              </div>
              <p className="modal-footnote">*Tier percentage discounts are non-stackable. Gold’s 10% discount does not apply to webstore orders.</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
