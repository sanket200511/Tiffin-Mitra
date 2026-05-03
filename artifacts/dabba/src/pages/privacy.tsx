export default function Privacy() {
  const updated = "1 May 2025";

  const sections = [
    {
      title: "1. Information we collect",
      body: `When you register on Dabba, we collect your name, email address, phone number, delivery address, and payment wallet information. When you browse the platform as a guest, we collect basic usage data such as pages viewed and search terms to improve the experience.

For vendors, we additionally collect your business name, FSSAI license number, bank account details for payouts, and kitchen address.`,
    },
    {
      title: "2. How we use your information",
      body: `We use your personal information to:
— Process and manage your tiffin subscriptions
— Facilitate deliveries and notify you of order status
— Process wallet top-ups and issue refunds
— Send you service-related communications (no spam)
— Detect and prevent fraudulent activity
— Improve our platform based on usage patterns

We do not sell your personal information to third parties.`,
    },
    {
      title: "3. Sharing your information",
      body: `We share your information only with:
— Vendors (your name, phone, and delivery address are shared with the kitchen fulfilling your order)
— Payment processors (to handle wallet top-ups and refunds)
— Service providers who operate our platform infrastructure (e.g. cloud hosting, email delivery)

All third parties are contractually bound to protect your data and use it only for the services they provide to Dabba.`,
    },
    {
      title: "4. Cookies and tracking",
      body: `We use essential cookies to keep you logged in and remember your preferences. We also use analytics cookies to understand how people use Dabba so we can improve it. You can disable non-essential cookies in your browser settings, though this may affect some features.`,
    },
    {
      title: "5. Data retention",
      body: `We retain your account data for as long as your account is active. If you request account deletion, we will permanently delete your personal data within 30 days, except where we are legally required to retain it (e.g. transaction records for tax compliance, up to 7 years).`,
    },
    {
      title: "6. Your rights",
      body: `You have the right to:
— Access the personal data we hold about you
— Request correction of inaccurate data
— Request deletion of your account and data
— Opt out of marketing communications at any time
— Raise a concern with the relevant data protection authority

To exercise any of these rights, email us at privacy@dabba.in.`,
    },
    {
      title: "7. Data security",
      body: `We use industry-standard encryption (TLS) for data in transit and encrypt sensitive data at rest. Access to personal data is restricted to Dabba employees and contractors who need it to do their jobs, and all access is logged.

No method of transmission over the internet is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee absolute security.`,
    },
    {
      title: "8. Children's privacy",
      body: `Dabba is not intended for children under the age of 13. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a child, please contact us and we will delete it promptly.`,
    },
    {
      title: "9. Changes to this policy",
      body: `We may update this Privacy Policy from time to time. We will notify you of material changes via email or a prominent notice on the platform at least 14 days before the change takes effect. Continued use of Dabba after the effective date constitutes acceptance of the updated policy.`,
    },
    {
      title: "10. Contact",
      body: `If you have questions or concerns about this Privacy Policy, please contact our Data Protection Officer at:

Email: privacy@dabba.in
Address: Dabba Technologies Pvt Ltd, WeWork BKC, Mumbai 400051`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-primary/5 py-16 md:py-20 border-b">
        <div className="container max-w-3xl">
          <p className="text-primary font-medium mb-3 tracking-wide uppercase text-sm">Legal</p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: <span className="font-medium text-foreground">{updated}</span>
          </p>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            Dabba Technologies Pvt Ltd ("Dabba", "we", "us") is committed to protecting your personal information. This policy explains what we collect, how we use it, and what rights you have.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container max-w-3xl">
          <div className="space-y-12">
            {sections.map((s, i) => (
              <div key={i}>
                <h2 className="text-xl font-bold font-serif mb-4 text-foreground">{s.title}</h2>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">{s.body}</div>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t text-center">
            <p className="text-muted-foreground text-sm">
              Questions? Email us at{" "}
              <a href="mailto:privacy@dabba.in" className="text-primary hover:underline">
                privacy@dabba.in
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
