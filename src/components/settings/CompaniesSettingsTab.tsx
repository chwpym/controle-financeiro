import React, { useEffect, useId, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Edit2,
  Globe,
  ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  Plus,
  Power,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Company, CompanyStatus } from '../../types';
import { api } from '../../utils/api';
import { cleanDocumentDigits, isValidCNPJ, maskCEP, maskCNPJ } from '../../utils/format';

export const COLOR_PRESETS = [
  '#0F766E',
  '#0D9488',
  '#16A34A',
  '#65A30D',
  '#2563EB',
  '#0284C7',
  '#4F46E5',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#475569',
];

export const COMPANY_TAG_COLORS = COLOR_PRESETS;

interface CompanyFormData {
  id?: string;
  legalName: string;
  tradeName: string;
  document: string;
  stateRegistration: string;
  municipalRegistration: string;
  status: CompanyStatus;
  email: string;
  phone: string;
  whatsapp: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  logoDataUrl: string;
  color: string;
  isDefault: boolean;
}

const emptyForm: CompanyFormData = {
  legalName: '',
  tradeName: '',
  document: '',
  stateRegistration: '',
  municipalRegistration: '',
  status: 'active',
  email: '',
  phone: '',
  whatsapp: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  logoDataUrl: '',
  color: '#0F766E',
  isDefault: false,
};

interface CompaniesSettingsTabProps {
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialCompanies?: Company[];
  onCompaniesChange?: (companies: Company[]) => void;
}

export const CompaniesSettingsTab: React.FC<CompaniesSettingsTabProps> = ({
  onNotify,
  initialCompanies,
  onCompaniesChange,
}) => {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies || []);
  const [loading, setLoading] = useState(!initialCompanies);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'general' | 'address'>('general');
  const [form, setForm] = useState<CompanyFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [lookupCepLoading, setLookupCepLoading] = useState(false);
  const [lookupCnpjLoading, setLookupCnpjLoading] = useState(false);

  // Delete modal state
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputId = useId();

  // Load companies
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const res = await api.getCompanies();
      const loaded = res.companies || [];
      setCompanies(loaded);
      onCompaniesChange?.(loaded);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar empresas.';
      onNotify?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialCompanies) {
      loadCompanies();
    }
  }, [initialCompanies]);

  // Handle open Drawer for Create
  const handleOpenCreate = () => {
    setForm(emptyForm);
    setActiveDrawerTab('general');
    setFormFeedback(null);
    setDrawerOpen(true);
  };

  // Handle open Drawer for Edit
  const handleOpenEdit = (comp: Company) => {
    setForm({
      id: comp.id,
      legalName: comp.legalName,
      tradeName: comp.tradeName,
      document: comp.document ? maskCNPJ(comp.document) : '',
      stateRegistration: comp.stateRegistration,
      municipalRegistration: comp.municipalRegistration,
      status: comp.status,
      email: comp.email,
      phone: comp.phone,
      whatsapp: comp.whatsapp,
      cep: comp.cep ? maskCEP(comp.cep) : '',
      street: comp.street,
      number: comp.number,
      complement: comp.complement,
      neighborhood: comp.neighborhood,
      city: comp.city,
      state: comp.state,
      logoDataUrl: comp.logoDataUrl || '',
      color: comp.color || '#0F766E',
      isDefault: comp.isDefault,
    });
    setActiveDrawerTab('general');
    setFormFeedback(null);
    setDrawerOpen(true);
  };

  // CEP lookup
  const handleConsultCep = async () => {
    const clean = form.cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      setFormFeedback({ kind: 'error', text: 'Informe um CEP válido com 8 dígitos para consultar.' });
      return;
    }
    setLookupCepLoading(true);
    setFormFeedback(null);
    try {
      const data = await api.lookupCep(clean);
      setForm((prev) => ({
        ...prev,
        street: data.street || prev.street,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
        complement: data.complement || prev.complement,
      }));
      setFormFeedback({ kind: 'success', text: 'Endereço preenchido com sucesso pelo CEP!' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível localizar o CEP.';
      setFormFeedback({ kind: 'error', text: msg });
    } finally {
      setLookupCepLoading(false);
    }
  };

  // CNPJ lookup
  const handleConsultCnpj = async () => {
    const clean = form.document.replace(/\D/g, '');
    if (clean.length !== 14) {
      setFormFeedback({
        kind: 'error',
        text: 'Informe um CNPJ válido com 14 dígitos para consultar.',
      });
      return;
    }
    setLookupCnpjLoading(true);
    setFormFeedback(null);
    try {
      const data = await api.lookupCnpj(clean);
      setForm((prev) => ({
        ...prev,
        legalName: data.name || prev.legalName,
        tradeName: data.tradeName || prev.tradeName || data.name || '',
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        cep: data.cep ? maskCEP(data.cep) : prev.cep,
        street: data.street || prev.street,
        number: data.number || prev.number,
        complement: data.complement || prev.complement,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }));
      setFormFeedback({
        kind: 'success',
        text: 'Dados preenchidos via consulta CNPJ. Você pode editar qualquer campo.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível consultar o CNPJ agora. Preencha manualmente.';
      setFormFeedback({ kind: 'error', text: msg });
    } finally {
      setLookupCnpjLoading(false);
    }
  };

  // Handle Logo Upload (PNG, JPG, WebP, SVG up to 2MB)
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setFormFeedback({
        kind: 'error',
        text: 'Formato inválido. Selecione uma imagem PNG, JPG, WebP ou SVG.',
      });
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFormFeedback({
        kind: 'error',
        text: 'O arquivo excede o limite de 2MB permitido para logotipos.',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setForm((prev) => ({ ...prev, logoDataUrl: dataUrl }));
      setFormFeedback({ kind: 'success', text: 'Logotipo carregado com sucesso!' });
    };
    reader.onerror = () => {
      setFormFeedback({ kind: 'error', text: 'Erro ao processar imagem.' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logoDataUrl: '' }));
  };

  // CNPJ status
  const cleanCnpjDigits = cleanDocumentDigits(form.document);
  const isCnpjComplete = cleanCnpjDigits.length === 14;
  const isCnpjValid = isValidCNPJ(cleanCnpjDigits);
  const showCnpjInvalidAlert = cleanCnpjDigits.length > 0 && isCnpjComplete && !isCnpjValid;

  // Submit Drawer Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!form.legalName.trim()) {
      setActiveDrawerTab('general');
      setFormFeedback({ kind: 'error', text: 'A Razão Social é obrigatória.' });
      return;
    }

    if (!form.id) {
      // For creation, CNPJ is required & validated
      if (!cleanCnpjDigits || !isCnpjValid) {
        setActiveDrawerTab('general');
        setFormFeedback({ kind: 'error', text: 'Informe um CNPJ válido com 14 dígitos.' });
        return;
      }
    } else if (cleanCnpjDigits && !isCnpjValid) {
      setActiveDrawerTab('general');
      setFormFeedback({ kind: 'error', text: 'O CNPJ informado é inválido.' });
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        const res = await api.updateCompany(form.id, {
          legalName: form.legalName.trim(),
          tradeName: form.tradeName.trim(),
          document: form.document.trim(),
          stateRegistration: form.stateRegistration.trim(),
          municipalRegistration: form.municipalRegistration.trim(),
          status: form.status,
          email: form.email.trim(),
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim(),
          cep: form.cep.trim(),
          street: form.street.trim(),
          number: form.number.trim(),
          complement: form.complement.trim(),
          neighborhood: form.neighborhood.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          logoDataUrl: form.logoDataUrl,
          color: form.color,
          isDefault: form.isDefault,
        });
        const updated = companies.map((c) => {
          if (c.id === form.id) return res.company;
          if (res.company.isDefault) return { ...c, isDefault: false };
          return c;
        });
        setCompanies(updated);
        onCompaniesChange?.(updated);
        onNotify?.(`Empresa "${res.company.tradeName || res.company.legalName}" atualizada com sucesso!`, 'success');
      } else {
        const res = await api.createCompany({
          legalName: form.legalName.trim(),
          tradeName: form.tradeName.trim(),
          document: form.document.trim(),
          stateRegistration: form.stateRegistration.trim(),
          municipalRegistration: form.municipalRegistration.trim(),
          status: form.status,
          email: form.email.trim(),
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim(),
          cep: form.cep.trim(),
          street: form.street.trim(),
          number: form.number.trim(),
          complement: form.complement.trim(),
          neighborhood: form.neighborhood.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          logoDataUrl: form.logoDataUrl,
          color: form.color,
          isDefault: form.isDefault,
        });
        const list = res.company.isDefault ? companies.map((c) => ({ ...c, isDefault: false })) : [...companies];
        const updated = [...list, res.company];
        setCompanies(updated);
        onCompaniesChange?.(updated);
        onNotify?.(`Empresa "${res.company.tradeName || res.company.legalName}" cadastrada com sucesso!`, 'success');
      }
      setDrawerOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar empresa.';
      setFormFeedback({ kind: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (comp: Company) => {
    if (comp.isDefault && comp.status === 'active') {
      onNotify?.('Não é possível inativar a empresa padrão. Defina outra empresa como padrão antes.', 'error');
      return;
    }
    const nextStatus: CompanyStatus = comp.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.updateCompanyStatus(comp.id, nextStatus);
      const updated = companies.map((c) => (c.id === comp.id ? res.company : c));
      setCompanies(updated);
      onCompaniesChange?.(updated);
      onNotify?.(
        `Empresa ${nextStatus === 'active' ? 'ativada' : 'inativada'} com sucesso!`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar status da empresa.';
      onNotify?.(msg, 'error');
    }
  };

  // Set Default
  const handleSetDefault = async (comp: Company) => {
    if (comp.isDefault) return;
    try {
      const res = await api.setCompanyDefault(comp.id);
      const updated = companies.map((c) => {
        if (c.id === comp.id) return res.company;
        return { ...c, isDefault: false };
      });
      setCompanies(updated);
      onCompaniesChange?.(updated);
      onNotify?.(`"${comp.tradeName || comp.legalName}" definida como empresa padrão!`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao definir empresa padrão.';
      onNotify?.(msg, 'error');
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!companyToDelete) return;
    if (companies.length <= 1) {
      onNotify?.('Não é possível excluir a única empresa cadastrada.', 'error');
      setCompanyToDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await api.deleteCompany(companyToDelete.id);
      onNotify?.(`Empresa "${companyToDelete.tradeName || companyToDelete.legalName}" excluída com sucesso!`, 'success');
      setCompanyToDelete(null);
      // Reload list to get updated default if needed
      await loadCompanies();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir empresa.';
      onNotify?.(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
                Minhas Empresas ({companies.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie múltiplos CNPJs, logotipos personalizados, status ativo/inativo e empresa padrão
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Empresa</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
          <p className="text-sm">Carregando empresas cadastradas...</p>
        </div>
      )}

      {/* Companies Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" data-testid="companies-grid">
          {companies.map((comp) => {
            const isInactive = comp.status === 'inactive';
            return (
              <div
                key={comp.id}
                data-testid={`company-card-${comp.id}`}
                className={`relative flex flex-col rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs ${
                  comp.isDefault
                    ? 'border-amber-400/70 dark:border-amber-500/50 ring-1 ring-amber-400/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                } ${isInactive ? 'opacity-75 bg-slate-50/50 dark:bg-slate-900/50' : ''}`}
              >
                {/* Visual Color Tag strip at the top */}
                <div
                  className="h-1.5 w-full rounded-t-2xl"
                  style={{ backgroundColor: comp.color || '#0F766E' }}
                />

                <div className="p-5 flex-1 flex flex-col space-y-4">
                  {/* Card Header: Logo + Names + Badges */}
                  <div className="flex items-start gap-3.5">
                    {/* Logo / Thumbnail */}
                    <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {comp.logoDataUrl ? (
                        <img
                          src={comp.logoDataUrl}
                          alt={`Logo ${comp.tradeName || comp.legalName}`}
                          className="w-full h-full object-contain p-1"
                          data-testid="company-card-logo"
                        />
                      ) : (
                        <Building2
                          className="w-7 h-7"
                          style={{ color: comp.color || '#0F766E' }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {comp.isDefault && (
                          <span
                            data-testid="badge-default"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80"
                          >
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Padrão
                          </span>
                        )}

                        <span
                          data-testid={`badge-status-${comp.status}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            comp.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              comp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {comp.status === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>

                      <h3
                        className="text-sm font-semibold text-slate-900 dark:text-white truncate"
                        title={comp.tradeName || comp.legalName}
                      >
                        {comp.tradeName || comp.legalName}
                      </h3>
                      <p
                        className="text-xs text-slate-500 dark:text-slate-400 truncate"
                        title={comp.legalName}
                      >
                        {comp.legalName}
                      </p>
                    </div>
                  </div>

                  {/* Details section */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500">CNPJ:</span>
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                        {comp.document ? maskCNPJ(comp.document) : '—'}
                      </span>
                    </div>

                    {(comp.stateRegistration || comp.municipalRegistration) && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 dark:text-slate-500">IE / IM:</span>
                        <span className="truncate text-slate-700 dark:text-slate-300">
                          {comp.stateRegistration || '—'} / {comp.municipalRegistration || '—'}
                        </span>
                      </div>
                    )}

                    {(comp.city || comp.state) && (
                      <div className="flex items-center gap-1.5 truncate pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {[comp.street, comp.number, comp.neighborhood, comp.city, comp.state]
                            .filter(Boolean)
                            .join(', ') || `${comp.city} - ${comp.state}`}
                        </span>
                      </div>
                    )}

                    {(comp.phone || comp.email) && (
                      <div className="flex items-center gap-3 pt-0.5 text-[11px]">
                        {comp.phone && (
                          <span className="flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            {comp.phone}
                          </span>
                        )}
                        {comp.email && (
                          <span className="flex items-center gap-1 truncate" title={comp.email}>
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {comp.email}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(comp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                        title="Editar dados da empresa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(comp)}
                        disabled={comp.isDefault && comp.status === 'active'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          comp.isDefault && comp.status === 'active'
                            ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                            : comp.status === 'active'
                              ? 'border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                              : 'border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        }`}
                        title={
                          comp.isDefault && comp.status === 'active'
                            ? 'Empresa padrão não pode ser inativada'
                            : comp.status === 'active'
                              ? 'Inativar empresa'
                              : 'Ativar empresa'
                        }
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{comp.status === 'active' ? 'Inativar' : 'Ativar'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!comp.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(comp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-medium text-amber-700 dark:text-amber-400 transition-colors"
                          title="Tornar esta empresa a padrão principal"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Padrão</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setCompanyToDelete(comp)}
                        disabled={companies.length <= 1}
                        className={`p-1.5 rounded-lg border text-xs transition-colors ${
                          companies.length <= 1
                            ? 'opacity-30 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400'
                            : 'border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400'
                        }`}
                        title={
                          companies.length <= 1
                            ? 'Não é possível excluir a única empresa cadastrada'
                            : 'Excluir empresa'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-in Drawer Modal for Create/Edit */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" data-testid="company-drawer">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    {form.id ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Preencha os dados cadastrais, logotipo e identificação visual
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Active/Inactive Toggle */}
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.status === 'active'}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.checked ? 'active' : 'inactive',
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600 relative"></div>
                  <span>Empresa Ativa</span>
                </label>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-950/20">
              <button
                type="button"
                onClick={() => setActiveDrawerTab('general')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeDrawerTab === 'general'
                    ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                1. Geral & Contato
              </button>
              <button
                type="button"
                onClick={() => setActiveDrawerTab('address')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeDrawerTab === 'address'
                    ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                2. Endereço Completo
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Feedback Alert */}
              {formFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    formFeedback.kind === 'error'
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {formFeedback.kind === 'error' ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{formFeedback.text}</span>
                </div>
              )}

              {/* TAB 1: Geral & Contato */}
              {activeDrawerTab === 'general' && (
                <div className="space-y-4">
                  {/* Logo Upload Section */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-white">
                      Logotipo da Empresa
                    </label>
                    <div className="flex items-center gap-4">
                      {form.logoDataUrl ? (
                        <div className="relative w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden p-1 shrink-0">
                          <img
                            src={form.logoDataUrl}
                            alt="Pré-visualização do logotipo"
                            className="w-full h-full object-contain"
                            data-testid="logo-preview-image"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
                          <ImageIcon className="w-7 h-7" />
                          <span className="text-[10px] mt-1">Sem logo</span>
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            id={fileInputId}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            onChange={handleLogoFileChange}
                            className="hidden"
                          />
                          <label
                            htmlFor={fileInputId}
                            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{form.logoDataUrl ? 'Trocar Logotipo' : 'Enviar Logotipo'}</span>
                          </label>

                          {form.logoDataUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remover</span>
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                          Formatos aceitos: PNG, JPG, WebP ou SVG (máx. 2MB). Convertido com segurança para visualização imediata.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Identification Color Tag */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Cor da Tag de Identificação Visual
                    </label>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5" />
                        Cor:
                      </span>
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, color }))}
                          aria-label={`Selecionar cor ${color}`}
                          className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                            form.color.toUpperCase() === color.toUpperCase()
                              ? 'border-slate-900 dark:border-white scale-110 shadow-xs'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <label
                        title="Escolher qualquer cor personalizada"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[11px] font-mono-tabular cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <input
                          type="color"
                          value={/^#[0-9A-Fa-f]{6}$/.test(form.color) ? form.color : '#0F766E'}
                          onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value.toUpperCase() }))}
                          className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                          data-testid="company-color-picker"
                        />
                        <span>Personalizada</span>
                      </label>
                      <input
                        type="text"
                        value={form.color}
                        onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                        maxLength={7}
                        aria-label="Código hexadecimal da cor da empresa"
                        data-testid="company-color-hex-input"
                        className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular uppercase"
                      />
                    </div>
                  </div>

                  {/* Razão Social & Nome Fantasia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Razão Social <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.legalName}
                        onChange={(e) => setForm((prev) => ({ ...prev, legalName: e.target.value }))}
                        placeholder="Ex: Minha Empresa Suprimentos Ltda"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nome Fantasia
                      </label>
                      <input
                        type="text"
                        value={form.tradeName}
                        onChange={(e) => setForm((prev) => ({ ...prev, tradeName: e.target.value }))}
                        placeholder="Ex: Minha Empresa"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          CNPJ <span className="text-red-500">*</span>
                        </label>
                        {isCnpjComplete && (
                          <span
                            data-testid="cnpj-validation-status"
                            className={`text-[10px] font-bold ${
                              isCnpjValid ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {isCnpjValid ? '✓ CNPJ Válido' : '✗ Dígitos Inválidos'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={form.document}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, document: maskCNPJ(e.target.value) }))
                          }
                          placeholder="00.000.000/0000-00"
                          className={`flex-1 px-3 py-2 rounded-xl border font-mono text-sm focus:outline-hidden focus:ring-2 min-h-[42px] ${
                            showCnpjInvalidAlert
                              ? 'border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-950/20 text-red-700 dark:text-red-300 focus:ring-red-500'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-teal-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleConsultCnpj}
                          disabled={lookupCnpjLoading}
                          data-testid="company-lookup-cnpj-btn"
                          className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap min-h-[42px] cursor-pointer"
                        >
                          {lookupCnpjLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Consultar
                        </button>
                      </div>
                      {showCnpjInvalidAlert && (
                        <p
                          data-testid="cnpj-invalid-warning"
                          className="text-[11px] text-red-600 dark:text-red-400 mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Os dígitos verificadores do CNPJ são matematicamente inválidos.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Inscrições Estadual e Municipal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Inscrição Estadual (IE)
                      </label>
                      <input
                        type="text"
                        value={form.stateRegistration}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, stateRegistration: e.target.value }))
                        }
                        placeholder="Ex: 123.456.789.000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Inscrição Municipal (IM)
                      </label>
                      <input
                        type="text"
                        value={form.municipalRegistration}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, municipalRegistration: e.target.value }))
                        }
                        placeholder="Ex: 9876543-2"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                  </div>

                  {/* Contato: E-mail, Telefone, WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="contato@empresa.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Telefone Fixo
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="(11) 3333-0000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={form.whatsapp}
                        onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
                        placeholder="(11) 99999-0000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                  </div>

                  {/* Default Company Checkbox */}
                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.isDefault}
                        onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                        className="w-4 h-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>Definir como Empresa Padrão Principal do sistema</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: Endereço Completo */}
              {activeDrawerTab === 'address' && (
                <div className="space-y-4">
                  {/* CEP with auto-lookup */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={form.cep}
                        onChange={(e) => setForm((prev) => ({ ...prev, cep: maskCEP(e.target.value) }))}
                        placeholder="00000-000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <button
                        type="button"
                        onClick={handleConsultCep}
                        disabled={lookupCepLoading}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold min-h-[42px] transition-colors"
                      >
                        {lookupCepLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                        ) : (
                          <MapPin className="w-4 h-4 text-teal-600" />
                        )}
                        <span>Buscar CEP</span>
                      </button>
                    </div>
                  </div>

                  {/* Street & Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Logradouro / Rua
                      </label>
                      <input
                        type="text"
                        value={form.street}
                        onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))}
                        placeholder="Ex: Av. Paulista"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        value={form.number}
                        onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
                        placeholder="Ex: 1000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                  </div>

                  {/* Complement & Neighborhood */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={form.complement}
                        onChange={(e) => setForm((prev) => ({ ...prev, complement: e.target.value }))}
                        placeholder="Ex: Sala 402"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={form.neighborhood}
                        onChange={(e) => setForm((prev) => ({ ...prev, neighborhood: e.target.value }))}
                        placeholder="Ex: Bela Vista"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                  </div>

                  {/* City & State */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                        placeholder="Ex: São Paulo"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        UF (Estado)
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={form.state}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))
                        }
                        placeholder="SP"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 uppercase font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 min-h-[42px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Drawer Footer Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{form.id ? 'Salvar Alterações' : 'Cadastrar Empresa'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {companyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 flex items-center justify-center text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Excluir Empresa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta ação não poderá ser desfeita
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tem certeza que deseja remover permanentemente a empresa{' '}
              <strong className="text-slate-900 dark:text-white">
                "{companyToDelete.tradeName || companyToDelete.legalName}"
              </strong>
              ?
              {companyToDelete.isDefault && (
                <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Atenção: Esta é a empresa padrão. Ao excluí-la, outra empresa ativa será automaticamente promovida a padrão.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCompanyToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Excluir Empresa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
