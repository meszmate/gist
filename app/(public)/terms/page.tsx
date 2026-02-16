import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service - gist",
  description: "Terms of Service for gist",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-8">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using gist (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use the Service. We reserve the right to
              modify these terms at any time, and your continued use of the Service constitutes acceptance
              of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              gist is an AI-powered study platform that allows users to create, manage, and share
              educational content including flashcards, quizzes, and study notes. The Service utilizes
              artificial intelligence to help generate study materials from user-provided content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Content</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You retain ownership of all content you create or upload to the Service. By using the Service, you grant us a
              limited license to store, process, and display your content solely for the purpose of providing the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You are solely responsible for ensuring that your content does not violate any applicable laws or
              infringe upon the rights of others. We reserve the right to remove any content that violates these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to use the Service to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Upload or share illegal, harmful, or offensive content</li>
              <li>Infringe upon intellectual property rights of others</li>
              <li>Distribute malware or engage in any malicious activities</li>
              <li>Attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
              <li>Use the Service for any commercial purpose without authorization</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service uses artificial intelligence to generate study materials. While we strive for accuracy,
              AI-generated content may contain errors or inaccuracies. You acknowledge that AI-generated content
              should be reviewed and verified before use, and we are not responsible for any consequences arising
              from reliance on AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your privacy is important to us. Our collection and use of personal information is governed by our
              Privacy Policy. By using the Service, you consent to our collection and use of data as described
              in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including its original content, features, and functionality, is owned by gist
              and is protected by international copyright, trademark, and other intellectual property laws.
              Our trademarks may not be used without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to terminate or suspend your account and access to the Service at our sole
              discretion, without notice, for conduct that we believe violates these Terms of Service or is
              harmful to other users, us, or third parties, or for any other reason.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
              ERROR-FREE, OR COMPLETELY SECURE. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER
              INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms of Service at any time. We will notify users of any
              material changes by posting the new Terms on this page and updating the &quot;Last updated&quot; date.
              Your continued use of the Service after any changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through our GitHub repository.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
