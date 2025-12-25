import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Typography, Descriptions, Spin, Button } from 'antd';
import { programRegistrationsService } from '../services/firebaseProgramRegistrations';
import { programsService } from '../services/firebasePrograms';
import { peopleService } from '../services/firebasePeople';
import { paymentMethodsService } from '../services/firebasePaymentMethods';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function RegistrationConfirmation() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [reg, setReg] = useState<any>(null);
  const [programName, setProgramName] = useState<string>('');
  const [registeredByDisplay, setRegisteredByDisplay] = useState<string>('');
  const [paymentMethodDisplay, setPaymentMethodDisplay] = useState<string>('');
  const [registrantDisplay, setRegistrantDisplay] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const r = await programRegistrationsService.getProgramRegistration(id);
        setReg(r);
      } catch (err) {
        console.error('Failed to load registration', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      if (!reg) return;
      try {
        // Resolve program name
        if (reg.programId || reg.programName) {
          let name = reg.programName as string | undefined;
          if (!name && reg.programId) {
            const list = await programsService.getPrograms();
            const p = list.find((x) => x.id === reg.programId);
            name = p?.name || reg.programId;
          }
          setProgramName(name || '');
        }

        // Resolve registrant (athlete) name if not denormalized
        if (!reg.playerName && !reg.athleteName && reg.athleteId) {
          try {
            const athlete = await peopleService.getPersonById(reg.athleteId);
            if (athlete) {
              const fullName = `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim();
              setRegistrantDisplay(fullName);
            }
          } catch {
            // ignore, fallback below
          }
        } else {
          setRegistrantDisplay(reg.playerName || reg.athleteName || '');
        }

        // Resolve registered by (person name if available)
        if (reg.registeredBy) {
          try {
            const person = await peopleService.getPersonByUserId(reg.registeredBy);
            if (person) {
              const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
              setRegisteredByDisplay(fullName || reg.registeredBy);
            } else {
              setRegisteredByDisplay(reg.registeredBy);
            }
          } catch {
            setRegisteredByDisplay(reg.registeredBy);
          }
        }

        // Prefer denormalized paymentDisplay; fallback to lookup/paymentMethod
        if (reg.paymentDisplay) {
          setPaymentMethodDisplay(reg.paymentDisplay);
        } else if (reg.paymentMethod) {
          let display = reg.paymentMethod as string;
          if (reg.registeredBy) {
            try {
              const methods = await paymentMethodsService.getPaymentMethodsByUser(reg.registeredBy);
              const m = methods.find((x) => x.id === reg.paymentMethod || x.stripePaymentMethodId === reg.paymentMethod);
              if (m) {
                const brand = (m.brand || '').toUpperCase();
                const last4 = m.last4 || '';
                display = `${brand} **** ${last4}`.trim();
              } else if (display === 'stripe') {
                display = 'Stripe';
              } else if (display === 'other') {
                display = 'Other';
              }
            } catch {
              // keep fallback
            }
          }
          setPaymentMethodDisplay(display);
        }
      } catch (e) {
        // non-blocking enhancements
         
        console.error('Failed to resolve confirmation display fields', e);
      }
    })();
  }, [reg]);

  if (loading) return <Spin />;
  if (!reg) return <div>Registration not found</div>;

  return (
    <div className="page-container">
      <Title level={2}>Registration Confirmation</Title>
      <Card>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Program">{programName || reg.programName || reg.programId}</Descriptions.Item>
          <Descriptions.Item label="Registrant">{registrantDisplay || reg.playerName || reg.athleteName || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Registered By">{registeredByDisplay || reg.registeredBy}</Descriptions.Item>
          <Descriptions.Item label="Amount">${((reg.totalAmount ?? reg.amount ?? 0) as number).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Payment Method">{reg.paymentDisplay || paymentMethodDisplay || reg.paymentMethod}</Descriptions.Item>
          <Descriptions.Item label="Status">{reg.status || 'pending'}</Descriptions.Item>
          <Descriptions.Item label="Created At">{reg.createdAt ? dayjs(reg.createdAt).format('MMM D, YYYY h:mm A') : ''}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 16 }}>
          <Button type="primary">
            <Link to="/my-registrations">Back to My Registrations</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
