import { prisma } from '@/lib/db';
import { PageHead } from '@/components/ui';
import { saveCompany } from './actions';

export const dynamic = 'force-dynamic';

export default async function CompanyPage() {
  const company = await prisma.company.findFirst();

  return (
    <>
      <PageHead
        title="Company profile"
        subtitle="These details are shared across every permit — company name, address, insurance, and bond flow into the forms automatically."
      />
      <div className="card" style={{ maxWidth: 860 }}>
        <form action={saveCompany}>
          {company && <input type="hidden" name="id" value={company.id} />}
          <div className="card-pad">
            <fieldset>
              <legend>Business</legend>
              <div className="form-grid">
                <div className="field"><label>Company name *</label><input className="input" name="name" defaultValue={company?.name ?? ''} required /></div>
                <div className="field"><label>Legal name</label><input className="input" name="legalName" defaultValue={company?.legalName ?? ''} /></div>
                <div className="field full"><label>Nature of business</label><input className="input" name="natureOfBusiness" defaultValue={company?.natureOfBusiness ?? ''} /></div>
                <div className="field"><label>EIN</label><input className="input" name="ein" defaultValue={company?.ein ?? ''} /></div>
                <div className="field"><label>Website</label><input className="input" name="website" defaultValue={company?.website ?? ''} /></div>
              </div>
            </fieldset>
            <fieldset>
              <legend>Address & contact</legend>
              <div className="field"><label>Street address</label><input className="input" name="address" defaultValue={company?.address ?? ''} /></div>
              <div className="form-grid">
                <div className="field"><label>City</label><input className="input" name="city" defaultValue={company?.city ?? ''} /></div>
                <div className="field"><label>State</label><input className="input" name="state" defaultValue={company?.state ?? ''} /></div>
                <div className="field"><label>ZIP</label><input className="input" name="zip" defaultValue={company?.zip ?? ''} /></div>
                <div className="field"><label>Phone</label><input className="input" name="phone" defaultValue={company?.phone ?? ''} /></div>
                <div className="field"><label>Email</label><input className="input" name="email" type="email" defaultValue={company?.email ?? ''} /></div>
                <div className="field"><label>Contact name</label><input className="input" name="contactName" defaultValue={company?.contactName ?? ''} /></div>
                <div className="field"><label>Contact title</label><input className="input" name="contactTitle" defaultValue={company?.contactTitle ?? ''} /></div>
              </div>
            </fieldset>
            <fieldset>
              <legend>Insurance & bond</legend>
              <div className="form-grid">
                <div className="field"><label>Insurance carrier</label><input className="input" name="insuranceCarrier" defaultValue={company?.insuranceCarrier ?? ''} /></div>
                <div className="field"><label>Insurance policy #</label><input className="input" name="insurancePolicyNum" defaultValue={company?.insurancePolicyNum ?? ''} /></div>
                <div className="field"><label>Bond number</label><input className="input" name="bondNumber" defaultValue={company?.bondNumber ?? ''} /></div>
              </div>
              <div className="field"><label>Notes</label><textarea className="textarea" name="notes" defaultValue={company?.notes ?? ''} /></div>
            </fieldset>
          </div>
          <div className="card-head" style={{ borderBottom: 'none', borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
            <button className="btn primary" type="submit">Save company profile</button>
          </div>
        </form>
      </div>
    </>
  );
}
