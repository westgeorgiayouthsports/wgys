import { Drawer, List, Button, Space, Typography, Divider, Popconfirm, message, Select } from 'antd';
import type { PaymentPlan } from '../../types/enums/program';
import { PaymentPlanValues } from '../../types/enums/program';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { removeItem, clearCart } from '../../store/slices/cartSlice';
import { programRegistrationsService } from '../../services/firebaseProgramRegistrations';
import { seasonsService } from '../../services/firebaseSeasons';
import { paymentPlansService } from '../../services/paymentPlans';
import { auditLogService } from '../../services/auditLog';
import { AuditEntity } from '../../types/enums';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const { Text, Title } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const items = useSelector((s: RootState) => s.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [paymentPlans, setPaymentPlans] = useState<Record<string, PaymentPlan>>({});
  const [discountCodeInput, setDiscountCodeInput] = useState<string>('');
  const [appliedCode, setAppliedCode] = useState<{ seasonId: string; code: string; type: string; amount: number } | null>(null);
  const [computedDiscounts, setComputedDiscounts] = useState<{ groupTotal: number; codeTotal: number }>(() => ({ groupTotal: 0, codeTotal: 0 }));
  const [availablePaymentPlans, setAvailablePaymentPlans] = useState<Array<any>>([]);
  const [selectedCartPaymentPlanId, setSelectedCartPaymentPlanId] = useState<string | 'full'>('full');

  useEffect(() => {
    const map: Record<string, PaymentPlan> = {};
    items.forEach(i => {
      map[i.id] = (i.paymentPlan || PaymentPlanValues.full) as PaymentPlan;
    });
    setPaymentPlans(map);

    // build available payment plans aggregated from seasons represented in cart
    (async () => {
      try {
        const seasonIds = Array.from(new Set(items.map(it => it.programSeasonId).filter(Boolean) as string[]));
        const plans: Array<any> = [];
        // load global payment plans and include those that apply to the season/program
        const allPlans = await paymentPlansService.getPaymentPlans();
        for (const sid of seasonIds) {
          const seasonItems = items.filter(it => it.programSeasonId === sid);
          const s = await seasonsService.getSeasonById(sid);
          for (const pp of (allPlans || [])) {
            if (pp.active === false) continue;
            // plan applies if no seasonId (global) OR matches this season OR lists this programId
            const appliesToSeason = !pp.seasonId || pp.seasonId === sid;
            const appliesToProgram = !pp.programIds || pp.programIds.length === 0 || seasonItems.some(si => (pp.programIds || []).includes(si.programId));
            if (appliesToSeason && appliesToProgram) {
              plans.push({ ...pp, seasonId: sid, seasonName: s ? s.name : undefined });
            }
          }
        }
        setAvailablePaymentPlans(plans);
        // default selection: if any plan exists pick the first, else 'full'
        if (plans.length > 0) setSelectedCartPaymentPlanId(plans[0].id);
        else setSelectedCartPaymentPlanId('full');
      } catch (e) {
        console.error('Error loading season payment plans', e);
        setAvailablePaymentPlans([]);
        setSelectedCartPaymentPlanId('full');
      }
    })();
  }, [items]);

  // recompute discounts whenever items, paymentPlans, or appliedCode change
  useEffect(() => {
    (async () => {
      try {
        // group items by season
        const bySeason: Record<string, typeof items> = {};
        for (const it of items) {
          const sid = it.programSeasonId || 'no-season';
          bySeason[sid] = bySeason[sid] || [];
          bySeason[sid].push(it);
        }

        let groupTotal = 0;
        // for each season, apply group discounts if defined on season
        for (const sid of Object.keys(bySeason)) {
          if (sid === 'no-season') continue;
          const season = await seasonsService.getSeasonById(sid);
          if (!season) continue;
          const discounts = season.groupDiscounts || {};
          if (!discounts || Object.keys(discounts).length === 0) continue;
          const list = bySeason[sid].slice().sort((a,b)=> (a.price - b.price));
          // discounts keys are registration positions (numbers)
          const positions = Object.keys(discounts).map(k => parseInt(k,10)).sort((a,b)=>a-b);
          for (const pos of positions) {
            if (list.length >= pos) {
              const disc = discounts[pos] || 0;
              const idx = pos - 1;
              const target = list[idx];
              if (target) {
                // apply discount capped at item price
                const applied = Math.min(disc, target.price * (target.quantity || 1));
                groupTotal += applied;
              }
            }
          }
        }

        // code discount
        let codeTotal = 0;
        if (appliedCode) {
          // apply code to matching season subtotal
          const sid = appliedCode.seasonId;
          const seasonItems = items.filter(i => (i.programSeasonId || 'no-season') === sid);
          const seasonSubtotal = seasonItems.reduce((s,i)=> s + (i.price * (i.quantity || 1)), 0);
          if (appliedCode.type === 'fixed') {
            codeTotal = Math.min(appliedCode.amount, seasonSubtotal);
          } else {
            codeTotal = Math.round((appliedCode.amount / 100) * seasonSubtotal);
          }
        }

        setComputedDiscounts({ groupTotal, codeTotal });
      } catch (e) {
        console.error('Error computing discounts', e);
        setComputedDiscounts({ groupTotal: 0, codeTotal: 0 });
      }
    })();
  }, [items, paymentPlans, appliedCode]);

  const total = items.reduce((s, i) => s + (i.price * (i.quantity || 1)), 0);

  const handleEmpty = () => {
    dispatch(clearCart());
    message.success('Cart emptied');
  };

  const handleRemove = (id: string) => {
    dispatch(removeItem(id));
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      message.info('Your cart is empty');
      return;
    }
    try {
      const subtotal = total;
      const discounts = { group: computedDiscounts.groupTotal, code: computedDiscounts.codeTotal };
      const finalAmount = Math.max(0, subtotal - discounts.group - discounts.code);

      // include selected cart payment plan details
      let selectedPlanObj: any = null;
      if (selectedCartPaymentPlanId && selectedCartPaymentPlanId !== 'full') {
        selectedPlanObj = availablePaymentPlans.find(p => p.id === selectedCartPaymentPlanId) || null;
      }

      // compute payment schedule
      let paymentSchedule: any = { type: 'full', initial: finalAmount, installments: [] };
      if (selectedPlanObj) {
        const initial = selectedPlanObj.initialAmount ?? 0;
        const remaining = Math.max(0, finalAmount - initial);
        const installments = selectedPlanObj.installments || 0;
        const perInstall = installments > 0 ? +(remaining / installments).toFixed(2) : 0;
        paymentSchedule = {
          type: 'plan',
          planId: selectedPlanObj.id,
          planName: selectedPlanObj.name,
          seasonId: selectedPlanObj.seasonId,
          initial: +initial.toFixed(2),
          installments: Array.from({ length: installments }).map((_, idx) => ({ installmentNumber: idx + 1, amount: perInstall, dueDay: selectedPlanObj.paymentDay || 1 })),
        };
      }

      const payload = {
        amount: Math.round(finalAmount * 100),
        currency: 'usd',
        items: items.map(i => ({ programId: i.programId, programName: i.programName, athleteId: i.athleteId, price: i.price, quantity: i.quantity })),
        discounts,
        appliedCode,
        paymentSchedule,
      };

      // Try server-side Checkout session creation (placeholder endpoint)
      try {
        const resp = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (resp.ok) {
          const data = await resp.json();
          await auditLogService.log({ action: 'cart.checkout.initiated', entityType: AuditEntity.Cart, details: { items, discounts, finalAmount, session: data } });
          if (data.url) {
            window.location.href = data.url;
            return;
          }
        }
      } catch (e) {
        console.warn('Stripe checkout endpoint not available, falling back to pending registrations', e);
      }

      // fallback: create registrations as pending and audit
      for (const it of items) {
        const selectedPlan: PaymentPlan = (paymentPlans[it.id] || it.paymentPlan || PaymentPlanValues.full) as PaymentPlan;
        await programRegistrationsService.createProgramRegistration(
          it.programId,
          'cart_checkout',
          it.responses || [],
          it.price,
          'cart',
          it.athleteId || undefined,
          undefined,
          selectedPlan,
          { programName: it.programName }
        );
      }

      await auditLogService.log({ action: 'cart.checkout.completed', entityType: AuditEntity.Cart, details: { items, discounts, finalAmount } });
      dispatch(clearCart());
      message.success('Checkout complete — registrations created (pending payment)');
      onClose();
      navigate('/my-registrations');
    } catch (err) {
      console.error('Checkout failed', err);
      message.error('Checkout failed');
    }
  };

  const handleApplyCode = async () => {
    if (!discountCodeInput) {
      message.info('Enter a discount code');
      return;
    }
    try {
      const seasonIds = Array.from(new Set(items.map(i => i.programSeasonId).filter(Boolean) as string[]));
      for (const sid of seasonIds) {
        const season = await seasonsService.getSeasonById(sid);
        if (!season || !season.discountCodes) continue;
        const found = (season.discountCodes || []).find(c => c.code.toLowerCase() === discountCodeInput.trim().toLowerCase() && (c.active ?? true));
        if (found) {
          setAppliedCode({ seasonId: sid, code: found.code, type: found.type || 'fixed', amount: found.amount });
          message.success('Discount code applied');
          return;
        }
      }
      message.error('Discount code not found for items in your cart');
    } catch (e) {
      console.error('Error applying discount code', e);
      message.error('Error applying discount code');
    }
  };

  return (
    <Drawer
      title={<Title level={4} style={{ margin: 0 }}>Shopping Cart</Title>}
      placement="right"
      size={420 as any}
      open={open}
      onClose={onClose}
      closable
      maskClosable
      keyboard
      zIndex={10010}
    >
      <List
        dataSource={items}
        renderItem={item => (
          <List.Item
            actions={[
              <Button danger onClick={() => handleRemove(item.id)}>Remove</Button>
            ]}
          >
            <List.Item.Meta
              title={<Text strong>{item.programName}</Text>}
              description={<div>
                <div><Text>Athlete: {item.athleteName || item.athleteId || '—'}</Text></div>
                <div style={{ marginTop: 6 }}>Qty: {item.quantity}</div>
                {/* per-item payment options removed — cart-level payment plan is selected below */}
              </div>}
            />
            <div><Text strong>${(item.price * (item.quantity || 1)).toFixed(2)}</Text></div>
          </List.Item>
        )}
      />

      <Divider />
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={discountCodeInput} onChange={(e) => setDiscountCodeInput(e.target.value)} placeholder="Discount code" style={{ flex: 1, padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
          <Button onClick={handleApplyCode}>Apply</Button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <Text strong>Payment Plan</Text>
          <div style={{ marginTop: 8 }}>
            {availablePaymentPlans.length === 0 ? (
              <div><Text>Pay in full only</Text></div>
            ) : (
              <Select value={selectedCartPaymentPlanId} onChange={(v) => setSelectedCartPaymentPlanId(v)} style={{ width: '100%' as any }}>
                <Select.Option value="full">Pay in Full</Select.Option>
                {availablePaymentPlans.map(p => (
                  <Select.Option key={`${p.seasonId}_${p.id}`} value={p.id}>{`${p.seasonName ? p.seasonName + ' - ' : ''}${p.name}`} — ${p.initialAmount ?? 0} upfront, {p.installments || 0} installments</Select.Option>
                ))}
              </Select>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text>Subtotal</Text>
          <Text>${total.toFixed(2)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text>Group discounts</Text>
          <Text>-${computedDiscounts.groupTotal.toFixed(2)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text>Code discount</Text>
          <Text>-${computedDiscounts.codeTotal.toFixed(2)}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text strong>Total</Text>
          <Text strong>${Math.max(0, total - computedDiscounts.groupTotal - computedDiscounts.codeTotal).toFixed(2)}</Text>
        </div>

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Popconfirm title="Empty cart?" onConfirm={handleEmpty} okText="Yes" cancelText="No">
            <Button danger>Empty Cart</Button>
          </Popconfirm>
          <Button type="primary" onClick={handleCheckout}>Finish & Pay</Button>
        </Space>
      </div>
    </Drawer>
  );
}
