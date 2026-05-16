import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  User,
  Pencil,
  ShieldCheck,
  Filter,
  Download,
  CheckCircle2,
  Linkedin,
  Globe,
  Mail,
  Loader2,
} from 'lucide-react';
import { url } from '../../baseUrl';
import { PROFILE_API } from '../../api/profile';
import { getAccessToken } from '../../utils/authStorage';
import { useAuth } from '../../contexts/Auth';
import LearnerFab from '../../components/LearnerFab';
import './ProfileSettings.css';

interface TabItem {
  key: string;
  label: string;
}

interface PaymentRow {
  key: string;
  date: string;
  course: string;
  amount: string;
  status: 'success';
}

interface ProfileData {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone_number: string | null;
  bio: string | null;
  created_at?: string;
  roles?: string[];
}

const tabs: TabItem[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'security', label: 'Security' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'payments', label: 'Payments' },
];

const placeholderPayments: PaymentRow[] = [
  {
    key: 'p1',
    date: 'May 12, 2024',
    course: 'Advanced UI Design Mastery',
    amount: '$129.99',
    status: 'success',
  },
  {
    key: 'p2',
    date: 'Apr 08, 2024',
    course: 'Front-end Engineering with Tailwind',
    amount: '$129.99',
    status: 'success',
  },
  {
    key: 'p3',
    date: 'Mar 15, 2024',
    course: 'UX Research Fundamentals',
    amount: '$129.99',
    status: 'success',
  },
];

const computeProfileCompletion = (p: ProfileData | null, linkedin: string, portfolio: string): number => {
  if (!p) return 0;
  const fields = [
    p.full_name?.trim(),
    p.email?.trim(),
    p.avatar_url,
    p.phone_number?.trim(),
    p.bio?.trim(),
    linkedin.trim(),
    portfolio.trim(),
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

const ProfileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('personal');

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [linkedin, setLinkedin] = useState<string>('');
  const [portfolio, setPortfolio] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [pwSaving, setPwSaving] = useState<boolean>(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [mfaSaving, setMfaSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`${url}${PROFILE_API.getProfile}`, { headers });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || 'Failed to load profile.');
        const data = (json?.data ?? json) as ProfileData;
        if (cancelled) return;
        setProfile(data);
        setFullName(data.full_name || '');
        setEmail(data.email || '');
        setBio(data.bio || '');
        setMfaEnabled(Boolean(user?.is_2fa_enabled));
      } catch (err: any) {
        if (!cancelled) {
          setLoadError(err?.message || 'Failed to load profile.');
          if (user) {
            setFullName(user.full_name || '');
            setEmail(user.email || '');
            setMfaEnabled(Boolean(user.is_2fa_enabled));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const avatarUrl = profile?.avatar_url || user?.avatar_url || undefined;
  const initial = (fullName.charAt(0) || email.charAt(0) || 'L').toUpperCase();
  const completionPct = computeProfileCompletion(profile, linkedin, portfolio);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const token = getAccessToken();
      const body = {
        full_name: fullName.trim(),
        phone_number: profile?.phone_number || '',
        bio: bio.trim(),
      };
      const res = await fetch(`${url}${PROFILE_API.updateProfile}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Could not update profile.');
      const updated = ((json as any)?.data ?? { ...(profile as ProfileData), ...body }) as ProfileData;
      setProfile(updated);
      updateUser({ full_name: updated.full_name });
      setSaveMessage('Profile updated successfully.');
    } catch (err: any) {
      setSaveError(err?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardProfile = () => {
    if (!profile) return;
    setFullName(profile.full_name || '');
    setEmail(profile.email || '');
    setBio(profile.bio || '');
    setLinkedin('');
    setPortfolio('');
    setSaveError(null);
    setSaveMessage(null);
  };

  const handleChangePassword = async () => {
    if (pwSaving) return;
    setPwError(null);
    setPwMessage(null);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwError('Please fill in every password field.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Password confirmation does not match.');
      return;
    }
    setPwSaving(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${url}${PROFILE_API.changePassword}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Could not change password.');
      setPwMessage('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err?.message || 'Could not change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleToggleMfa = async () => {
    if (mfaSaving) return;
    const next = !mfaEnabled;
    setMfaSaving(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${url}${PROFILE_API.updateSecurity}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_2fa_enabled: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Could not update MFA setting.');
      setMfaEnabled(next);
      updateUser({ is_2fa_enabled: next });
    } catch (err: any) {
      setSaveError(err?.message || 'Could not update MFA setting.');
    } finally {
      setMfaSaving(false);
    }
  };

  return (
    <div className="ps-page">
      <main className="ps-main">
        <div className="ps-container">
          <section className="ps-page-head">
            <div>
              <h2 className="ps-page-title">Account Settings</h2>
              <p className="ps-page-sub">
                Manage your personal information, security preferences, and billing.
              </p>
            </div>
          </section>

          <div className="ps-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`ps-tab ${activeTab === tab.key ? 'ps-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loadError && <div className="ps-banner ps-banner--error">{loadError}</div>}

          <section className="ps-grid">
            <aside className="ps-side">
              <div className="ps-profile-card">
                <div className="ps-profile-glow" />
                <div className="ps-avatar-wrap">
                  {avatarUrl ? (
                    <img
                      className="ps-profile-avatar"
                      alt={fullName || 'Profile'}
                      src={avatarUrl}
                    />
                  ) : (
                    <div className="ps-profile-avatar ps-profile-avatar-fallback">
                      {initial}
                    </div>
                  )}
                  <button
                    type="button"
                    className="ps-avatar-edit"
                    aria-label="Edit photo"
                    onClick={() => navigate('/profile')}
                  >
                    <Pencil size={14} strokeWidth={2.4} />
                  </button>
                </div>
                <h3 className="ps-profile-name">{fullName || 'Your Name'}</h3>
                <p className="ps-profile-role">{email || 'your@email.com'}</p>
                <span className="ps-badge">
                  <Award size={12} strokeWidth={2.4} />
                  {profile?.roles?.includes('admin')
                    ? 'Admin'
                    : profile?.roles?.includes('course_manager')
                    ? 'Course Manager'
                    : 'Premium Learner'}
                </span>
              </div>

              <div className="ps-stat-card">
                <div className="ps-stat-head">
                  <h4 className="ps-stat-title">Profile Completion</h4>
                  <span className="ps-stat-value">{completionPct}%</span>
                </div>
                <div className="ps-stat-track">
                  <div
                    className="ps-stat-fill"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <p className="ps-stat-hint">
                  {completionPct >= 100
                    ? 'Profile is fully complete — nicely done.'
                    : `${completionPct}% complete — add a bio and social links to finish up.`}
                </p>
              </div>
            </aside>

            <form className="ps-form-card" onSubmit={handleSaveProfile}>
              <h3 className="ps-section-title">Personal Details</h3>

              <div className="ps-fields">
                <div className="ps-field">
                  <label className="ps-label" htmlFor="ps-fullname">Full Name</label>
                  <div className="ps-input-wrap">
                    <User size={16} strokeWidth={2.2} className="ps-input-icon" />
                    <input
                      id="ps-fullname"
                      type="text"
                      className="ps-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="ps-field">
                  <label className="ps-label" htmlFor="ps-email">Email Address</label>
                  <div className="ps-input-wrap">
                    <Mail size={16} strokeWidth={2.2} className="ps-input-icon" />
                    <input
                      id="ps-email"
                      type="email"
                      className="ps-input"
                      value={email}
                      readOnly
                    />
                  </div>
                </div>

                <div className="ps-field ps-field--full">
                  <label className="ps-label" htmlFor="ps-bio">Short Bio</label>
                  <textarea
                    id="ps-bio"
                    className="ps-textarea"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={loading}
                  />
                  <span className="ps-helper">{bio.length} / 220 characters</span>
                </div>

                <div className="ps-field">
                  <label className="ps-label" htmlFor="ps-linkedin">LinkedIn Profile</label>
                  <div className="ps-input-wrap">
                    <Linkedin size={16} strokeWidth={2.2} className="ps-input-icon" />
                    <input
                      id="ps-linkedin"
                      type="url"
                      className="ps-input"
                      placeholder="https://linkedin.com/in/..."
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                    />
                  </div>
                </div>

                <div className="ps-field">
                  <label className="ps-label" htmlFor="ps-portfolio">Portfolio Website</label>
                  <div className="ps-input-wrap">
                    <Globe size={16} strokeWidth={2.2} className="ps-input-icon" />
                    <input
                      id="ps-portfolio"
                      type="url"
                      className="ps-input"
                      placeholder="https://yourdomain.dev"
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {saveError && <div className="ps-banner ps-banner--error">{saveError}</div>}
              {saveMessage && <div className="ps-banner ps-banner--success">{saveMessage}</div>}

              <div className="ps-form-foot">
                <button
                  type="button"
                  className="ps-cancel-btn"
                  onClick={handleDiscardProfile}
                  disabled={saving}
                >
                  Discard
                </button>
                <button type="submit" className="ps-save-btn" disabled={saving || loading}>
                  {saving ? (
                    <>
                      <Loader2 size={14} className="ps-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </section>

          <section className="ps-grid ps-grid--security">
            <div className="ps-security-card">
              <h3 className="ps-section-title">
                <span className="ps-section-icon">
                  <ShieldCheck size={18} strokeWidth={2.2} />
                </span>
                Security Settings
              </h3>

              <div className="ps-fields">
                <div className="ps-field">
                  <label className="ps-label" htmlFor="ps-old-pwd">Old Password</label>
                  <input
                    id="ps-old-pwd"
                    type="password"
                    className="ps-input ps-input--solo"
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>
                <div className="ps-field" />
                <div className="ps-field">
                  <label className="ps-label" htmlFor="ps-new-pwd">New Password</label>
                  <input
                    id="ps-new-pwd"
                    type="password"
                    className="ps-input ps-input--solo"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="ps-field">
                  <label className="ps-label" htmlFor="ps-confirm-pwd">Confirm New Password</label>
                  <input
                    id="ps-confirm-pwd"
                    type="password"
                    className="ps-input ps-input--solo"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {pwError && <div className="ps-banner ps-banner--error">{pwError}</div>}
              {pwMessage && <div className="ps-banner ps-banner--success">{pwMessage}</div>}

              <div className="ps-form-foot">
                <button
                  type="button"
                  className="ps-save-btn"
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                >
                  {pwSaving ? (
                    <>
                      <Loader2 size={14} className="ps-spin" />
                      Updating…
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </div>

            <div className="ps-mfa-card">
              <div className="ps-mfa-glow" />
              <div className="ps-mfa-head">
                <span className="ps-mfa-icon">
                  <ShieldCheck size={20} strokeWidth={2.2} />
                </span>
                <h3 className="ps-mfa-title">Two-Factor Auth</h3>
              </div>
              <p className="ps-mfa-body">
                Add an extra layer of security to your account by requiring a code
                from your phone to log in.
              </p>

              <div className="ps-mfa-toggle-row">
                <span className="ps-mfa-status">
                  MFA Status
                  <small
                    className={`ps-mfa-pill ${
                      mfaEnabled ? 'ps-mfa-pill--on' : 'ps-mfa-pill--off'
                    }`}
                  >
                    {mfaEnabled ? 'Enabled' : 'Disabled'}
                  </small>
                </span>

                <button
                  type="button"
                  role="switch"
                  aria-checked={mfaEnabled}
                  className={`ps-switch ${mfaEnabled ? 'ps-switch--on' : ''}`}
                  onClick={handleToggleMfa}
                  disabled={mfaSaving}
                >
                  <span className="ps-switch-thumb" />
                </button>
              </div>
            </div>
          </section>

          <section className="ps-payments-card">
            <div className="ps-payments-head">
              <div>
                <h3 className="ps-section-title">Payment History</h3>
                <p className="ps-payments-sub">
                  All your recent course transactions and downloadable invoices.
                </p>
              </div>
              <button type="button" className="ps-filter-btn">
                <Filter size={14} strokeWidth={2.2} />
                Filter
              </button>
            </div>

            <div className="ps-table-wrap">
              <table className="ps-table">
                <thead className="ps-thead">
                  <tr>
                    <th className="ps-th">Date</th>
                    <th className="ps-th">Course Name</th>
                    <th className="ps-th">Amount</th>
                    <th className="ps-th">Status</th>
                    <th className="ps-th ps-th--right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="ps-tbody">
                  {placeholderPayments.map((p) => (
                    <tr key={p.key} className="ps-tr">
                      <td className="ps-td ps-td--meta">{p.date}</td>
                      <td className="ps-td ps-td--course">{p.course}</td>
                      <td className="ps-td ps-td--amount">{p.amount}</td>
                      <td className="ps-td">
                        <span className="ps-status">
                          <CheckCircle2 size={12} strokeWidth={2.6} />
                          Success
                        </span>
                      </td>
                      <td className="ps-td ps-td--right">
                        <button
                          type="button"
                          className="ps-download-btn"
                          aria-label="Download invoice"
                        >
                          <Download size={16} strokeWidth={2.2} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <LearnerFab onClick={() => navigate('/my-courses')} />
    </div>
  );
};

export default ProfileSettings;
