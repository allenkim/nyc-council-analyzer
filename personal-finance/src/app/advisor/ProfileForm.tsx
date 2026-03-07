"use client";

import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

interface Profile {
  age: number;
  annualIncome: number;
  riskTolerance: string;
  filingStatus?: string | null;
  employmentType?: string | null;
  stateOfResidence?: string | null;
  employer401kMatch?: string | null;
  dependents?: number | null;
  isHomeowner?: boolean | null;
  monthlyTakeHome?: number | null;
}

export default function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [form, setForm] = useState({
    age: "",
    annualIncome: "",
    riskTolerance: "MODERATE",
    filingStatus: "",
    employmentType: "",
    stateOfResidence: "",
    employer401kMatch: "",
    dependents: "",
    isHomeowner: "",
    monthlyTakeHome: "",
  });

  useEffect(() => {
    fetch(apiUrl("/api/profile"))
      .then((r) => r.json())
      .then((data) => {
        if (data && data.age) {
          setProfile(data);
          setForm({
            age: String(data.age),
            annualIncome: String(data.annualIncome),
            riskTolerance: data.riskTolerance,
            filingStatus: data.filingStatus || "",
            employmentType: data.employmentType || "",
            stateOfResidence: data.stateOfResidence || "",
            employer401kMatch: data.employer401kMatch || "",
            dependents: data.dependents != null ? String(data.dependents) : "",
            isHomeowner: data.isHomeowner != null ? String(data.isHomeowner) : "",
            monthlyTakeHome: data.monthlyTakeHome ? String(data.monthlyTakeHome) : "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body: Record<string, unknown> = {
      age: parseInt(form.age),
      annualIncome: parseFloat(form.annualIncome),
      riskTolerance: form.riskTolerance,
    };

    if (form.filingStatus) body.filingStatus = form.filingStatus;
    if (form.employmentType) body.employmentType = form.employmentType;
    if (form.stateOfResidence) body.stateOfResidence = form.stateOfResidence;
    if (form.employer401kMatch) body.employer401kMatch = form.employer401kMatch;
    if (form.dependents) body.dependents = parseInt(form.dependents);
    if (form.isHomeowner) body.isHomeowner = form.isHomeowner === "true";
    if (form.monthlyTakeHome) body.monthlyTakeHome = parseFloat(form.monthlyTakeHome);

    const res = await fetch(apiUrl("/api/profile"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setProfile(data);
    }

    setSaving(false);
  }

  if (loading) return <div className="text-muted text-sm">Loading profile...</div>;

  const inputClass = "w-full bg-transparent border border-card-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent";
  const selectClass = inputClass;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted font-medium mb-1 block">Age *</label>
          <input type="number" required value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className={inputClass} placeholder="30" />
        </div>
        <div>
          <label className="text-xs text-muted font-medium mb-1 block">Annual Income *</label>
          <input type="number" required value={form.annualIncome} onChange={(e) => setForm({ ...form, annualIncome: e.target.value })} className={inputClass} placeholder="75000" />
        </div>
        <div>
          <label className="text-xs text-muted font-medium mb-1 block">Risk Tolerance *</label>
          <select value={form.riskTolerance} onChange={(e) => setForm({ ...form, riskTolerance: e.target.value })} className={selectClass}>
            <option value="CONSERVATIVE">Conservative</option>
            <option value="MODERATE">Moderate</option>
            <option value="AGGRESSIVE">Aggressive</option>
          </select>
        </div>
      </div>

      <button type="button" onClick={() => setShowOptional(!showOptional)} className="text-xs text-muted hover:text-foreground transition-colors">
        {showOptional ? "Hide" : "Show"} optional fields (for better advice)
      </button>

      {showOptional && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Filing Status</label>
            <select value={form.filingStatus} onChange={(e) => setForm({ ...form, filingStatus: e.target.value })} className={selectClass}>
              <option value="">Not set</option>
              <option value="SINGLE">Single</option>
              <option value="MARRIED_FILING_JOINTLY">Married Filing Jointly</option>
              <option value="MARRIED_FILING_SEPARATELY">Married Filing Separately</option>
              <option value="HEAD_OF_HOUSEHOLD">Head of Household</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Employment Type</label>
            <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} className={selectClass}>
              <option value="">Not set</option>
              <option value="W2">W-2 Employee</option>
              <option value="SELF_EMPLOYED_1099">Self-Employed (1099)</option>
              <option value="RETIRED">Retired</option>
              <option value="STUDENT">Student</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">State of Residence</label>
            <input value={form.stateOfResidence} onChange={(e) => setForm({ ...form, stateOfResidence: e.target.value })} className={inputClass} placeholder="e.g., CA, NY" />
          </div>
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Monthly Take-Home Pay</label>
            <input type="number" value={form.monthlyTakeHome} onChange={(e) => setForm({ ...form, monthlyTakeHome: e.target.value })} className={inputClass} placeholder="5000" />
          </div>
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Dependents</label>
            <input type="number" value={form.dependents} onChange={(e) => setForm({ ...form, dependents: e.target.value })} className={inputClass} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Homeowner</label>
            <select value={form.isHomeowner} onChange={(e) => setForm({ ...form, isHomeowner: e.target.value })} className={selectClass}>
              <option value="">Not set</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      )}

      <button type="submit" disabled={saving || !form.age || !form.annualIncome} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
        {saving ? "Saving..." : profile ? "Update Profile" : "Save Profile"}
      </button>
    </form>
  );
}
