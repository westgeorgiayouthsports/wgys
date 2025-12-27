import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Card, Form, Input, Button, Typography, Divider, App } from 'antd';
import { MailOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { signInWithEmail, signInWithGoogle } from '../services/firebaseAuth';
import { setUser } from '../store/slices/authSlice';
import wgysLogo from '../assets/wgys-logo-small.png';
import './auth-override.css';

const { Title, Text } = Typography;

export default function SignIn() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const handleEmailSignIn = async (values: { email: string; password: string }) => {
    setLoading(true);

    try {
      const userCredential = await signInWithEmail(values.email, values.password);
      dispatch(setUser({ user: userCredential.user }));
      navigate('/admin/dashboard');
    } catch (err: any) {
      message.error({ content: err.message || 'Failed to sign in' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      const user = await signInWithGoogle();
      dispatch(setUser({ user }));
      navigate('/admin/dashboard');
    } catch (err: any) {
      message.error({ content: err.message || 'Failed to sign in with Google' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card
        style={{ width: 400, maxWidth: '100%' }}
        variant="borderless"
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src={wgysLogo}
            alt="WGYS Logo"
            style={{ width: 80, height: 80, marginBottom: 16 }}
          />
          <Title
            level={2}
            style={{
              margin: 0,
              fontFamily: 'Impact, "Arial Black", sans-serif',
              fontWeight: 900,
              letterSpacing: '1px'
            }}
          >
            WEST GEORGIA YOUTH SPORTS, INC.
          </Title>
          <Text type="secondary">Sign in to your account</Text>
        </div>

        <Form
          form={form}
          onFinish={handleEmailSignIn}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email address"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              disabled={loading}
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider>OR</Divider>

        <Button
          icon={<GoogleOutlined />}
          onClick={handleGoogleSignIn}
          block
          loading={loading}
        >
          Sign in with Google
        </Button>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
