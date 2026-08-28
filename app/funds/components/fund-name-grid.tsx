'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import {
  listFundTranslations,
  createFundTranslation,
  updateFundTranslation,
  removeFundTranslation,
} from '@/lib/cash-advance/api/client';

/** Language info from the Common service (GET /api/common/languages). */
interface LanguageOption {
  id: number;
  code: string;
  name: string;
  nativeName: string | null;
}

interface FundTranslationRow {
  languageId: number;
  name: string;
}

/** Persian language id — editable but never deletable (primary translation). */
const FA_LANGUAGE_ID = 12;

function showToast(message: string, type: 'success' | 'error') {
  toast.custom(
    () => (
      <Alert variant="mono" icon={type === 'success' ? 'success' : 'destructive'}>
        <AlertIcon>
          {type === 'success' ? <RiCheckboxCircleFill /> : <RiErrorWarningFill />}
        </AlertIcon>
        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    { position: 'top-center' },
  );
}

interface FundNameGridProps {
  fundId: string;
}

/**
 * Multi-language fund-name grid — mirrors the Person name-translation method.
 * On edit each change persists immediately against CashAdvanceTranslation; the
 * Persian (fa) row cannot be removed. Add-language only offers languages not yet used.
 */
export function FundNameGrid({ fundId }: FundNameGridProps) {
  const { t } = useTranslation('cash-advance');

  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [rows, setRows] = useState<FundTranslationRow[]>([]);

  const [formVisible, setFormVisible] = useState(false);
  const [editingLangId, setEditingLangId] = useState<number | null>(null);
  const [selectedLangId, setSelectedLangId] = useState<number>(FA_LANGUAGE_ID);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/common/languages');
        if (res.ok) setLanguages(await res.json());
      } catch {
        /* non-fatal — the grid still lists existing rows */
      }
    })();
  }, []);

  const loadRows = useCallback(async () => {
    try {
      const all = await listFundTranslations();
      setRows(
        all
          .filter((x) => x.cashAdvanceId === fundId)
          .map((x) => ({ languageId: x.languageId, name: x.name })),
      );
    } catch {
      showToast(t('admin.funds.names.loadError', { defaultValue: 'Failed to load names' }), 'error');
    }
  }, [fundId, t]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const languageName = (langId: number) => {
    const lang = languages.find((l) => l.id === langId);
    return lang?.nativeName || lang?.name || String(langId);
  };

  const selectedLang = languages.find((l) => l.id === selectedLangId);
  const isLangRtl = selectedLang?.code === 'fa' || selectedLang?.code === 'ar';

  const availableLanguages = useMemo(() => {
    if (editingLangId !== null) return languages;
    const used = new Set(rows.map((r) => r.languageId));
    return languages.filter((l) => !used.has(l.id));
  }, [languages, rows, editingLangId]);

  const openAdd = () => {
    setEditingLangId(null);
    const def =
      availableLanguages.find((l) => l.id === FA_LANGUAGE_ID)?.id ??
      availableLanguages[0]?.id ??
      FA_LANGUAGE_ID;
    setSelectedLangId(def);
    setName('');
    setFormVisible(true);
  };

  const openEdit = (r: FundTranslationRow) => {
    setEditingLangId(r.languageId);
    setSelectedLangId(r.languageId);
    setName(r.name);
    setFormVisible(true);
  };

  const cancel = () => {
    setFormVisible(false);
    setEditingLangId(null);
    setName('');
  };

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (editingLangId !== null) {
        await updateFundTranslation({
          cashAdvanceId: fundId,
          languageId: selectedLangId,
          name: name.trim(),
        });
        showToast(t('admin.funds.names.updated', { defaultValue: 'Name updated' }), 'success');
      } else {
        await createFundTranslation({
          cashAdvanceId: fundId,
          languageId: selectedLangId,
          name: name.trim(),
        });
        showToast(t('admin.funds.names.added', { defaultValue: 'Name added' }), 'success');
      }
      cancel();
      await loadRows();
    } catch (e) {
      showToast(
        (e as Error)?.message ||
          t('admin.funds.names.saveError', { defaultValue: 'Failed to save name' }),
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (langId: number) => {
    if (langId === FA_LANGUAGE_ID) return;
    setBusy(true);
    try {
      await removeFundTranslation({ cashAdvanceId: fundId, languageId: langId });
      showToast(t('admin.funds.names.deleted', { defaultValue: 'Name deleted' }), 'error');
      await loadRows();
    } catch (e) {
      showToast(
        (e as Error)?.message ||
          t('admin.funds.names.deleteError', { defaultValue: 'Failed to delete name' }),
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">
          {t('admin.funds.names.empty', {
            defaultValue: 'No names registered. Add at least one language.',
          })}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.funds.names.language', { defaultValue: 'Language' })}</TableHead>
              <TableHead>{t('admin.funds.names.name', { defaultValue: 'Name' })}</TableHead>
              <TableHead className="w-20 text-center">
                {t('admin.funds.names.actions', { defaultValue: 'Actions' })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.languageId}>
                <TableCell>
                  <Badge variant="outline" className="text-xs px-1.5">
                    {languageName(r.languageId)}
                  </Badge>
                </TableCell>
                <TableCell style={{ unicodeBidi: 'plaintext' }}>{r.name}</TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(r)}
                      disabled={busy}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {r.languageId !== FA_LANGUAGE_ID && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => remove(r.languageId)}
                        disabled={busy}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {formVisible ? (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <p className="text-sm font-medium">
            {editingLangId !== null
              ? t('admin.funds.names.editTitle', { defaultValue: 'Edit Name' })
              : t('admin.funds.names.addTitle', { defaultValue: 'Add Language' })}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('admin.funds.names.language', { defaultValue: 'Language' })}</Label>
              <Select
                value={selectedLangId.toString()}
                onValueChange={(v) => setSelectedLangId(parseInt(v, 10))}
                disabled={editingLangId !== null}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(editingLangId !== null ? languages : availableLanguages).map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>
                      {l.nativeName || l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.funds.names.name', { defaultValue: 'Name' })}</Label>
              <Input
                value={name}
                dir={name ? (isLangRtl ? 'rtl' : 'ltr') : undefined}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  selectedLang
                    ? `${t('admin.funds.names.nameIn', { defaultValue: 'Name in' })} ${
                        selectedLang.nativeName || selectedLang.name
                      }`
                    : ''
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={cancel}>
              {t('admin.common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button type="button" size="sm" onClick={submit} disabled={busy || !name.trim()}>
              {t('admin.common.save', { defaultValue: 'Save' })}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openAdd}
            disabled={busy || availableLanguages.length === 0}
          >
            <Plus className="h-4 w-4 ml-1" />
            {t('admin.funds.names.addTitle', { defaultValue: 'Add Language' })}
          </Button>
        </div>
      )}
    </div>
  );
}
