"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, KeyRound, Save, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LoadingButton } from "@/components/ui/loading-button";

const maxPhotoBytes = 3 * 1024 * 1024;
const photoTypes = ["image/jpeg", "image/png", "image/webp"];

export function ProfileSettings({ email, initialName, initialAvatarUrl, embedded = false }: { email: string; initialName: string; initialAvatarUrl: string; embedded?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    if (!photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const visiblePhoto = photoPreview || avatarUrl;

  function choosePhoto(file?: File) {
    if (!file) return;
    if (!photoTypes.includes(file.type)) { setProfileError("Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > maxPhotoBytes) { setProfileError("Profile photos must be 3 MB or smaller."); return; }
    setProfileError(""); setProfileSuccess(""); setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file));
  }

  function oldPhotoStoragePath(url: string) {
    const marker = "/storage/v1/object/public/profile-photos/";
    const position = url.indexOf(marker);
    return position < 0 ? null : decodeURIComponent(url.slice(position + marker.length).split("?")[0]);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { setProfileError("Enter your name."); return; }
    setProfileBusy(true); setProfileError(""); setProfileSuccess("");
    const client = createSupabaseBrowserClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) { setProfileBusy(false); setProfileError("Your session has expired. Sign in again."); return; }

    let nextAvatarUrl = avatarUrl;
    let uploadedPath = "";
    if (photoFile) {
      const extension = photoFile.type === "image/jpeg" ? "jpg" : photoFile.type === "image/png" ? "png" : "webp";
      uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await client.storage.from("profile-photos").upload(uploadedPath, photoFile, {
        cacheControl: "3600", contentType: photoFile.type, upsert: false,
      });
      if (uploadError) { setProfileBusy(false); setProfileError(uploadError.message); return; }
      nextAvatarUrl = client.storage.from("profile-photos").getPublicUrl(uploadedPath).data.publicUrl;
    }

    const { error: updateError } = await client.from("profiles").update({ full_name: cleanName, avatar_url: nextAvatarUrl || null }).eq("id", user.id);
    if (updateError) {
      if (uploadedPath) await client.storage.from("profile-photos").remove([uploadedPath]);
      setProfileBusy(false); setProfileError(updateError.message); return;
    }

    const priorPhotoPath = photoFile ? oldPhotoStoragePath(avatarUrl) : null;
    if (priorPhotoPath) {
      const { error: removeError } = await client.storage.from("profile-photos").remove([priorPhotoPath]);
      if (removeError) console.error("Could not remove replaced profile photo", removeError);
    }
    setProfileBusy(false); setAvatarUrl(nextAvatarUrl); setPhotoFile(null); setPhotoPreview(""); setProfileSuccess("Profile updated."); router.refresh();
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordError(""); setPasswordSuccess("");
    if (password.length < 12) { setPasswordError("Use a password with at least 12 characters."); return; }
    if (password !== confirmPassword) { setPasswordError("The passwords do not match."); return; }
    if (password === currentPassword) { setPasswordError("Choose a password different from your current one."); return; }
    setPasswordBusy(true);
    const client = createSupabaseBrowserClient();
    // Confirm the current password first, so someone using an unlocked,
    // signed-in screen cannot take over the account.
    const { error: verifyError } = await client.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) { setPasswordBusy(false); setPasswordError("Your current password is incorrect."); return; }
    const { error } = await client.auth.updateUser({ password });
    setPasswordBusy(false);
    if (error) { setPasswordError(error.message); return; }
    setCurrentPassword(""); setPassword(""); setConfirmPassword(""); setPasswordSuccess("Password changed successfully.");
  }

  // Inside the resident/official shell the page heading is provided by the shell.
  return <div className={embedded ? undefined : "page-wrap"}>
    {!embedded && <>
      <div className="topline"><div className="breadcrumb"><strong>Profile</strong></div></div>
      <div className="page-heading"><div><div className="eyebrow">YOUR ACCOUNT</div><h1>Edit profile</h1><p className="subtitle">Update your profile details and sign-in password.</p></div></div>
    </>}
    <div className="profile-settings-grid">
      <section className="profile-settings-card" aria-labelledby="profile-details-title">
        <div className="profile-settings-heading"><span className="profile-section-icon"><Camera size={18} /></span><div><h2 id="profile-details-title">Profile details</h2><p>Update the name and photo shown on your dashboard.</p></div></div>
        <form className="profile-settings-form" onSubmit={(event) => void saveProfile(event)}>
          <div className="profile-photo-editor profile-page-photo"><span className="profile-photo-preview">{visiblePhoto ? <img src={visiblePhoto} alt="Profile photo preview" /> : "AB"}</span><div><label className="button secondary photo-upload-button"><Camera size={14} />{photoFile ? "Choose another photo" : avatarUrl ? "Change photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { choosePhoto(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label><small>JPG, PNG, or WebP · up to 3 MB</small></div></div>
          <label className="field"><span>Name</span><input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required /></label>
          <label className="field"><span>Email</span><input value={email} readOnly /><small className="field-hint">Email is managed by your sign-in provider.</small></label>
          {profileError && <div className="inline-error" role="alert">{profileError}</div>}{profileSuccess && <div className="profile-success" role="status"><CheckCircle2 size={15} />{profileSuccess}</div>}
          <LoadingButton className="button primary profile-form-save" loading={profileBusy} loadingText="Saving…"><Save size={15} />Save profile</LoadingButton>
        </form>
      </section>
      <section className="profile-settings-card" aria-labelledby="password-title">
        <div className="profile-settings-heading"><span className="profile-section-icon"><KeyRound size={18} /></span><div><h2 id="password-title">Change password</h2><p>Choose a new password to secure your account.</p></div></div>
        <form className="profile-settings-form" onSubmit={(event) => void updatePassword(event)}>
          <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
          <label className="field"><span>New password</span><input type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /><small className="field-hint">Use at least 12 characters.</small></label>
          <label className="field"><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
          {passwordError && <div className="inline-error" role="alert">{passwordError}</div>}{passwordSuccess && <div className="profile-success" role="status"><CheckCircle2 size={15} />{passwordSuccess}</div>}
          <LoadingButton className="button primary profile-form-save" loading={passwordBusy} loadingText="Updating…"><ShieldCheck size={15} />Update password</LoadingButton>
        </form>
      </section>
    </div>
  </div>;
}
