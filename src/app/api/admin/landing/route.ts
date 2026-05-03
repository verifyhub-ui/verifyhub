import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const DEFAULT_CONTENT = {
  hero: {
    title: 'Virtual Phone Numbers',
    subtitle: 'SMS Verification',
    description: 'Get instant temporary phone numbers for SMS verification across 150+ countries. Fast, reliable, and affordable.',
    ctaText: 'Get Started Free',
    showStats: true,
  },
  stats: [
    { value: '150+', label: 'Countries' },
    { value: '5000+', label: 'Active Numbers' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' },
  ],
  howItWorks: {
    title: 'How It Works',
    subtitle: 'Get your virtual number in three simple steps',
    steps: [
      { title: 'Choose Service', description: 'Select the platform you need to verify your account on', icon: 'Search' },
      { title: 'Get Number', description: 'Receive a temporary phone number instantly', icon: 'Phone' },
      { title: 'Receive SMS', description: 'Get your verification code within seconds', icon: 'MessageSquare' },
    ],
  },
  features: {
    title: 'Why Choose VerifyHub?',
    subtitle: 'Everything you need for seamless SMS verification',
    items: [
      { title: 'Instant Activation', description: 'Numbers ready to use in seconds, no waiting required', icon: 'Zap', color: 'violet' },
      { title: 'Global Coverage', description: 'Access numbers from 150+ countries worldwide', icon: 'Globe', color: 'cyan' },
      { title: 'Secure & Private', description: 'Your data is encrypted and never shared', icon: 'Shield', color: 'pink' },
      { title: '24/7 Support', description: 'Our team is always here to help you', icon: 'Headphones', color: 'orange' },
      { title: 'Best Prices', description: 'Most competitive rates in the market', icon: 'BadgeDollarSign', color: 'emerald' },
      { title: 'API Access', description: 'Easy integration with your applications', icon: 'Code', color: 'blue' },
    ],
  },
  testimonials: {
    title: 'Trusted by Thousands',
    subtitle: 'See what our users say about VerifyHub',
    items: [
      { name: 'Alex Johnson', role: 'Full-Stack Developer', text: 'VerifyHub is the best SMS verification service I\'ve ever used. Fast, reliable, and the API integration was a breeze.', initials: 'AJ', rating: 5 },
      { name: 'Sarah Chen', role: 'Business Owner', text: 'We use VerifyHub for all our client verifications. The uptime is incredible and the pricing is very competitive.', initials: 'SC', rating: 5 },
      { name: 'Mike Davis', role: 'Digital Marketer', text: 'Great service with excellent customer support. Numbers are delivered instantly and work perfectly every time.', initials: 'MD', rating: 5 },
    ],
  },
  cta: {
    title: 'Ready to Get Started?',
    subtitle: 'Join thousands of users who trust VerifyHub for their verification needs. Create your free account today.',
    buttonText: 'Create Free Account',
  },
  footer: {
    description: 'VerifyHub is the leading platform for virtual phone numbers and SMS verification services worldwide.',
    copyright: '© 2025 VerifyHub. All rights reserved.',
    links: [
      { label: 'Privacy Policy', url: '#' },
      { label: 'Terms of Service', url: '#' },
      { label: 'Contact Us', url: '#' },
    ],
  },
};

// GET /api/admin/landing - Admin: get landing page content
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const setting = await db.settings.findUnique({
      where: { key: 'landing_page_content' },
    });

    const content = setting ? JSON.parse(setting.value) : DEFAULT_CONTENT;

    return NextResponse.json({ success: true, data: content });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

// PUT /api/admin/landing - Admin: update landing page content
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid content' },
        { status: 400 }
      );
    }

    await db.settings.upsert({
      where: { key: 'landing_page_content' },
      update: { value: JSON.stringify(content) },
      create: { key: 'landing_page_content', value: JSON.stringify(content) },
    });

    return NextResponse.json({ success: true, message: 'Landing page updated successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
