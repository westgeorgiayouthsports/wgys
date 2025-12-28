import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  Button,
  Space,
  Row,
  Col,
  Modal,
  Popconfirm,
  Tag,
  Typography,
  App,
  Switch,
} from 'antd';
import { CreditCardOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { RootState } from '../store/store';
import { paymentMethodsService, type PaymentMethod } from '../services/firebasePaymentMethods';
import { functions } from '../services/firebase';
import { httpsCallable } from 'firebase/functions';

const { Title, Text } = Typography;

// Initialize Stripe with your publishable key (resolved via getEnv to avoid import.meta at module scope)
import { getEnv } from '../utils/env';
const stripePromise = loadStripe(getEnv('VITE_STRIPE_PUBLISHABLE_KEY') || '');

// Card element styling
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
};

// Separate component for the add card form (needs access to Stripe hooks)
function AddPaymentMethodForm({
  onSuccess,
  onCancel,
  userId
}: {
  onSuccess: () => void;
  onCancel: () => void;
  userId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { message } = App.useApp();
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      message.error('Stripe is not loaded');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      message.error('Card element not found');
      return;
    }

    setProcessing(true);

    try {
      // 1) Create SetupIntent via Cloud Function
      const createSetupIntentFn = httpsCallable(functions, 'createSetupIntent');
      const result: any = await createSetupIntentFn({});
      const clientSecret: string | undefined = result?.data?.clientSecret;
      if (!clientSecret) {
        throw new Error('Failed to create SetupIntent');
      }

      // 2) Confirm the card setup client-side to attach PM to customer
      const confirmResult = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (confirmResult.error) {
        throw new Error(confirmResult.error.message || 'Failed to confirm card setup');
      }

      const setupIntent = confirmResult.setupIntent;
      const paymentMethodId = (setupIntent?.payment_method as string) || '';
      if (!paymentMethodId) {
        throw new Error('No payment method ID returned');
      }

      // 3) Fetch display info for the PM via Cloud Function (brand/last4/exp)
      const getDisplayFn = httpsCallable(functions, 'getPaymentMethodDisplay');
      const displayRes: any = await getDisplayFn({ paymentMethodId });
      const display = displayRes?.data || {};

      // 4) Save payment method to Firebase with Stripe PM ID
      await paymentMethodsService.createPaymentMethod(
        userId,
        'card',
        display.last4 || '',
        (display.brand || 'CARD'),
        display.expMonth,
        display.expYear,
        paymentMethodId
      );

      message.success('Payment method added successfully');
      onSuccess();
    } catch (error: any) {
      console.error('❌ Error adding payment method:', error);
      message.error(error.message || 'Failed to add payment method');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Card Information
        </label>
        <div
          style={{
            padding: '11px 11px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            transition: 'all 0.3s',
          }}
        >
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={(e) => setCardComplete(e.complete)}
          />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
          Your card information is securely processed by Stripe. We never see or store your full card number.
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            disabled={!stripe || !cardComplete || processing}
            loading={processing}
          >
            Add Payment Method
          </Button>
        </Space>
      </div>
    </form>
  );
}

export default function PaymentMethodsPage() {
  const { message } = App.useApp();
  const { user, role } = useSelector((state: RootState) => state.auth);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);

  const isAdmin = role === 'admin' || role === 'owner';

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async (includeDeletedOverride?: boolean) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const includeDeleted = includeDeletedOverride ?? Boolean(showDeleted && isAdmin);
      const methods = await paymentMethodsService.getPaymentMethodsByUser(user.uid, includeDeleted);
      setPaymentMethods(methods);
    } catch (error) {
      console.error('❌ Error loading payment methods:', error);
      message.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = () => {
    setPaymentModalVisible(true);
  };

  const handlePaymentMethodSuccess = () => {
    setPaymentModalVisible(false);
    loadPaymentMethods();
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    try {
      await paymentMethodsService.deletePaymentMethod(methodId);
      message.success('Payment method removed');
      loadPaymentMethods();
    } catch (error) {
      console.error('❌ Error deleting payment method:', error);
      message.error('Failed to remove payment method');
    }
  };

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    if (!user?.uid) return;
    try {
      await paymentMethodsService.setDefaultPaymentMethod(user.uid, methodId);
      message.success('Default payment method updated');
      loadPaymentMethods();
    } catch (error) {
      console.error('❌ Error setting default:', error);
      message.error('Failed to set default payment method');
    }
  };

  const handleRestorePaymentMethod = async (methodId: string) => {
    try {
      const auditId = await paymentMethodsService.restorePaymentMethod(methodId);
      message.success('Payment method restored');
      // Show audit confirmation to admins with the created audit id (if any)
      if (isAdmin) {
        if (auditId) {
          Modal.info({
            title: 'Restore recorded in Audit Log',
            content: (
              <div>
                <p>Restore action has been recorded.</p>
                <p style={{ fontSize: 12, color: '#666' }}>Audit ID: {auditId}</p>
                <p style={{ fontSize: 12, color: '#666' }}>
                  You can review this entry in the Audit Logs page.
                </p>
              </div>
            ),
            okText: 'Close',
          });
        } else {
          Modal.info({
            title: 'Restore recorded',
            content: 'Restore completed but no audit id was returned.',
            okText: 'Close',
          });
        }
      }
      loadPaymentMethods();
    } catch (error) {
      console.error('❌ Error restoring payment method:', error);
      message.error('Failed to restore payment method');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <CreditCardOutlined />
            <span>Payment Methods</span>
          </Space>
        }
        extra={
            <Space>
              {isAdmin && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12 }}>
                  <Switch checked={showDeleted} onChange={(v) => { setShowDeleted(v); void loadPaymentMethods(v && isAdmin); }} />
                  <span style={{ fontSize: 12 }}>Show deleted</span>
                </span>
              )}

              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPaymentMethod}>
                Add Payment Method
              </Button>
            </Space>
        }
        loading={loading}
      >
        {paymentMethods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <CreditCardOutlined style={{ fontSize: 64, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
            <Title level={4} type="secondary">
              No payment methods added yet
            </Title>
            <Text type="secondary">Add a payment method to speed up registration checkout</Text>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {paymentMethods.map((method) => (
              <Col xs={24} sm={12} md={8} lg={6} key={method.id}>
                <div
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: 12,
                    padding: '10px 32px 10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    position: 'relative',
                    minHeight: 60,
                    // Visual distinction for deleted items
                    opacity: method.deleted ? 0.9 : 1,
                    background: method.deleted ? 'transparent' : 'rgba(0,0,0,0.06)',
                    color: method.deleted ? '#8c8c8c' : 'inherit',
                  }}
               >
                  {/* Top: Default/Set default (hide for deleted methods) */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', minHeight: 20 }}>
                    {method.deleted ? (
                      <Tag color="red" style={{ height: 20, lineHeight: '20px', padding: '0 8px', margin: 0 }}>Deleted</Tag>
                    ) : method.isDefault ? (
                      <Tag color="blue" style={{ height: 20, lineHeight: '20px', padding: '0 8px', margin: 0 }}>Default</Tag>
                    ) : (
                      <Button
                        type="link"
                        size="small"
                        onClick={() => handleSetDefaultPaymentMethod(method.id)}
                        style={{ padding: 0, height: 20, lineHeight: '20px' }}
                      >
                        Set default
                      </Button>
                    )}
                  </div>

                  {/* Bottom: Brand, Masked number, Expiry */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                    {/* Left: Brand */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CreditCardOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                      <Text
                        strong
                        style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {method.brand || 'Card'}
                      </Text>
                    </div>

                    {/* Middle: Masked last4 */}
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 70 }}>
                      <Text style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>**** {method.last4}</Text>
                    </div>

                    {/* Right: Expiry */}
                    <div style={{ flexShrink: 0 }}>
                      {method.expMonth && method.expYear ? (
                        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          Exp {method.expMonth}/{method.expYear}
                        </Text>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Exp —/—</Text>
                      )}
                    </div>
                  </div>

                  {/* Inline actions: delete for active methods, restore for deleted (admin only) */}
                  {method.deleted ? (
                    isAdmin ? (
                      <Popconfirm
                        title="Restore this payment method?"
                        description="This will make the payment method available again."
                        onConfirm={() => handleRestorePaymentMethod(method.id)}
                        okText="Restore"
                        cancelText="Cancel"
                      >
                        <Button
                          type="default"
                          style={{ position: 'absolute', top: 6, right: 6 }}
                        >
                          Restore
                        </Button>
                      </Popconfirm>
                    ) : null
                  ) : (
                    <Popconfirm
                      title="Remove this payment method?"
                      description="This action cannot be undone."
                      onConfirm={() => handleDeletePaymentMethod(method.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        type="text"
                        aria-label="Remove payment method"
                        icon={<CloseOutlined />}
                        style={{ position: 'absolute', top: 6, right: 6 }}
                      />
                    </Popconfirm>
                  )}
                </div>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Add Payment Method Modal with Stripe Elements */}
      <Modal
        title="Add Payment Method"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={500}
      >
        {user?.uid && (
          <Elements stripe={stripePromise}>
            <AddPaymentMethodForm
              userId={user.uid}
              onSuccess={handlePaymentMethodSuccess}
              onCancel={() => setPaymentModalVisible(false)}
            />
          </Elements>
        )}
      </Modal>
    </div>
  );
}
