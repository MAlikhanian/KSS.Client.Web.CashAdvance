'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AmountInput } from '@/components/ui/amount-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { translateApiError } from '@/lib/format-utils';
import {
  createChargeRequestItem,
  updateChargeRequestItem,
  type ChargeRequestItemView,
  type ProductView,
  type ProductTranslationView,
  type StatusView,
  type StatusTranslationView,
} from '@/lib/cash-advance/api/client';
import { ProductPicker } from './product-picker';
import { StatusSelect, statusIsRejected } from './status-select';
import { formatRial } from '@/lib/cash-advance/format';

interface ItemDialogProps {
  open: boolean;
  /** Item being edited, or null when adding a new one. */
  item: ChargeRequestItemView | null;
  requestId: string;
  products: ProductView[];
  productTranslations: ProductTranslationView[];
  statuses: StatusView[];
  statusTranslations: StatusTranslationView[];
  langId: number;
  onClose: () => void;
  onSaved: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export function ItemDialog({
  open,
  item,
  requestId,
  products,
  productTranslations,
  statuses,
  statusTranslations,
  langId,
  onClose,
  onSaved,
  onSuccess,
  onError,
}: ItemDialogProps) {
  const { t } = useTranslation('cash-advance');
  const isEdit = Boolean(item);

  const [productId, setProductId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [statusId, setStatusId] = useState<number>(0);
  const [statusDescription, setStatusDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProductId(item?.productId ?? null);
    setDescription(item?.description ?? '');
    setQuantity(item?.quantity ?? 0);
    setUnitPrice(item?.unitPrice ?? 0);
    setStatusId(item?.statusId ?? 0);
    setStatusDescription(item?.statusDescription ?? '');
  }, [open, item]);

  const lineTotal = (Number(quantity) || 0) * (Number(unitPrice) || 0);
  const rejected = statusIsRejected(statuses, statusId);

  const handleSave = async () => {
    if (!productId) {
      onError(
        t('ops.requestDetail.itemValidation.productRequired', {
          defaultValue: 'Product is required',
        }),
      );
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      onError(
        t('ops.requestDetail.itemValidation.quantityRequired', {
          defaultValue: 'Quantity is required',
        }),
      );
      return;
    }
    if (!unitPrice || Number(unitPrice) <= 0) {
      onError(
        t('ops.requestDetail.itemValidation.unitPriceRequired', {
          defaultValue: 'Unit price is required',
        }),
      );
      return;
    }
    if (isEdit && rejected && !statusDescription.trim()) {
      onError(
        t('ops.requestDetail.itemValidation.reasonRequired', {
          defaultValue: 'A reason is required when the item is rejected',
        }),
      );
      return;
    }

    setSaving(true);
    try {
      if (isEdit && item) {
        await updateChargeRequestItem({
          id: item.id,
          productId,
          statusId,
          description: description.trim() || null,
          statusDescription: rejected ? statusDescription.trim() : null,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          lineTotal,
        });
      } else {
        // Never send an id on create — the backend stamps a v7 GUID.
        await createChargeRequestItem({
          cashAdvanceChargeRequestId: requestId,
          productId,
          description: description.trim() || null,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          lineTotal,
        });
      }
      onSuccess(
        t('ops.requestDetail.toasts.itemSaved', { defaultValue: 'Item saved' }),
      );
      onSaved();
      onClose();
    } catch (e) {
      // Surface backend business errors (e.g. the fund-ceiling rule) instead of a generic message.
      onError(translateApiError((e as Error)?.message ?? '', t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('ops.common.edit', { defaultValue: 'Edit' })
              : t('ops.requestDetail.addItem', { defaultValue: 'Add Item' })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{t('ops.requestDetail.itemForm.product', { defaultValue: 'Product' })}</Label>
            <ProductPicker
              products={products}
              translations={productTranslations}
              value={productId}
              onChange={setProductId}
              langId={langId}
            />
          </div>

          <div className="space-y-1">
            <Label>
              {t('ops.requestDetail.itemForm.description', { defaultValue: 'Description' })}
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('ops.requestDetail.itemForm.descriptionPlaceholder', {
                defaultValue: 'Description of item or service',
              })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>
                {t('ops.requestDetail.itemForm.quantity', { defaultValue: 'Quantity' })}
              </Label>
              <Input
                type="number"
                min={0}
                dir={quantity ? 'ltr' : undefined}
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>
                {t('ops.requestDetail.itemForm.unitPrice', { defaultValue: 'Unit Price' })}
              </Label>
              <AmountInput
                value={String(unitPrice || '')}
                onChange={(raw) => setUnitPrice(raw === '' ? 0 : Number(raw))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
            <span className="text-sm text-muted-foreground">
              {t('ops.requestDetail.itemForm.lineTotal', { defaultValue: 'Line Total' })}
            </span>
            <span className="text-sm font-medium">{formatRial(lineTotal)}</span>
          </div>

          {isEdit && (
            <>
              <div className="space-y-1">
                <Label>
                  {t('ops.requestDetail.itemColumns.status', { defaultValue: 'Status' })}
                </Label>
                <StatusSelect
                  statuses={statuses}
                  translations={statusTranslations}
                  langId={langId}
                  value={statusId}
                  onChange={setStatusId}
                />
              </div>
              {rejected && (
                <div className="space-y-1">
                  <Label>
                    {t('ops.common.statusReason', { defaultValue: 'Reason' })}
                  </Label>
                  <Textarea
                    value={statusDescription}
                    onChange={(e) => setStatusDescription(e.target.value)}
                    placeholder={t('ops.common.statusReasonPlaceholder', {
                      defaultValue: 'Explain the reason (required when rejected)…',
                    })}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('ops.common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving
              ? t('ops.common.processing', { defaultValue: 'Processing...' })
              : t('ops.common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
