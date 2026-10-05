import os

components = [
    {
        "no": 2,
        "name": "Capacity Building & Training",
        "annexure": "Annexure-II",
        "fields": [
            {"name": "datePeriod", "label": "Date / Period", "type": "text"},
            {"name": "trainingName", "label": "Training Name", "type": "text"},
            {"name": "trainingType", "label": "Training Type", "type": "text"},
            {"name": "participant", "label": "Participant / Expert", "type": "text"},
            {"name": "venue", "label": "Venue", "type": "text"},
            {"name": "trainingDays", "label": "Training Days", "type": "number"},
            {"name": "trainerFee", "label": "Trainer Fee", "type": "number"},
            {"name": "trainingCost", "label": "Training Cost", "type": "number"},
            {"name": "travelAllowance", "label": "Travel Allowance", "type": "number"},
            {"name": "accommodation", "label": "Accommodation", "type": "number"},
            {"name": "otherExpenses", "label": "Other Expenses", "type": "number"},
            {"name": "utrNumber", "label": "UTR Number", "type": "text"},
            {"name": "remarks", "label": "Remarks", "type": "text"},
        ],
        "sumFields": ["trainerFee", "trainingCost", "travelAllowance", "accommodation", "otherExpenses"]
    },
    {
        "no": 3,
        "name": "Human Resource & Technical Support",
        "annexure": "Annexure-III",
        "fields": [
            {"name": "datePeriod", "label": "Date / Period", "type": "text"},
            {"name": "personnelName", "label": "Personnel Name", "type": "text"},
            {"name": "designation", "label": "Designation", "type": "text"},
            {"name": "supportType", "label": "Support Type", "type": "text"},
            {"name": "department", "label": "Department", "type": "text"},
            {"name": "workPeriod", "label": "Work Period", "type": "text"},
            {"name": "remuneration", "label": "Remuneration", "type": "number"},
            {"name": "taDa", "label": "TA / DA", "type": "number"},
            {"name": "otherCharges", "label": "Other Charges", "type": "number"},
            {"name": "utrNumber", "label": "UTR Number", "type": "text"},
            {"name": "remarks", "label": "Remarks", "type": "text"},
        ],
        "sumFields": ["remuneration", "taDa", "otherCharges"]
    },
    {
        "no": 4,
        "name": "Digital Infrastructure, Archive & Network Services",
        "annexure": "Annexure-IV",
        "fields": [
            {"name": "datePeriod", "label": "Date / Period", "type": "text"},
            {"name": "service", "label": "Service / Item", "type": "text"},
            {"name": "description", "label": "Description", "type": "text"},
            {"name": "vendor", "label": "Vendor / Agency", "type": "text"},
            {"name": "purchaseRef", "label": "Purchase Ref", "type": "text"},
            {"name": "quantity", "label": "Quantity", "type": "number"},
            {"name": "unitCost", "label": "Unit Cost", "type": "number"},
            {"name": "servicePeriod", "label": "Service Period", "type": "text"},
            {"name": "infrastructureCost", "label": "Infrastructure Cost", "type": "number"},
            {"name": "bandwidthCost", "label": "Bandwidth Cost", "type": "number"},
            {"name": "archiveCost", "label": "Archive Cost", "type": "number"},
            {"name": "otherCharges", "label": "Other Charges", "type": "number"},
            {"name": "invoiceNo", "label": "Invoice No", "type": "text"},
            {"name": "utrNumber", "label": "UTR Number", "type": "text"},
            {"name": "remarks", "label": "Remarks", "type": "text"},
        ],
        "sumFields": ["infrastructureCost", "bandwidthCost", "archiveCost", "otherCharges"]
    },
    {
        "no": 5,
        "name": "School Telecast & Distribution Infrastructure",
        "annexure": "Annexure-V",
        "fields": [
            {"name": "datePeriod", "label": "Date / Period", "type": "text"},
            {"name": "school", "label": "School", "type": "text"},
            {"name": "activity", "label": "Activity", "type": "text"},
            {"name": "equipment", "label": "Equipment", "type": "text"},
            {"name": "quantity", "label": "Quantity", "type": "number"},
            {"name": "unitCost", "label": "Unit Cost", "type": "number"},
            {"name": "installationCost", "label": "Installation Cost", "type": "number"},
            {"name": "transportation", "label": "Transportation", "type": "number"},
            {"name": "otherCharges", "label": "Other Charges", "type": "number"},
            {"name": "vendor", "label": "Vendor", "type": "text"},
            {"name": "invoiceNo", "label": "Invoice No", "type": "text"},
            {"name": "utrNumber", "label": "UTR Number", "type": "text"},
            {"name": "remarks", "label": "Remarks", "type": "text"},
        ],
        "sumFields": ["installationCost", "transportation", "otherCharges"]
    },
    {
        "no": 6,
        "name": "Outreach, Feedback, Research & Advocacy",
        "annexure": "Annexure-VI",
        "fields": [
            {"name": "datePeriod", "label": "Date / Period", "type": "text"},
            {"name": "platform", "label": "Platform", "type": "text"},
            {"name": "campaignDesc", "label": "Campaign Description", "type": "text"},
            {"name": "serviceProvider", "label": "Service Provider", "type": "text"},
            {"name": "campaignType", "label": "Campaign Type", "type": "text"},
            {"name": "amount", "label": "Amount", "type": "number"},
            {"name": "tax", "label": "Tax", "type": "number"},
            {"name": "utrNumber", "label": "UTR Number", "type": "text"},
            {"name": "remarks", "label": "Remarks", "type": "text"},
        ],
        "sumFields": ["amount", "tax"]
    }
]

base_path = "src/app/budget"
romans = ["I", "II", "III", "IV", "V", "VI"]

for comp in components:
    c_no = comp["no"]
    c_name = comp["name"]
    c_annex = comp["annexure"]
    c_roman = romans[c_no - 1]
    
    dir_path = os.path.join(base_path, f"annexure-{c_no}")
    os.makedirs(dir_path, exist_ok=True)
    
    # 1. Generate page.tsx
    page_code = f"""import React from 'react';
import Link from 'next/link';
import {{ getComponent{c_no}Data }} from '../actions';
import styles from '../budget.module.css';
import Component{c_no}Client from './Component{c_no}Client';

export default async function Component{c_no}Page() {{
  const compData = await getComponent{c_no}Data();
  if (!compData) return <div>Component not found</div>;

  return (
    <div className={{styles.container}}>
      <div className={{styles.header}}>
        <div className={{styles.actionsBar}}>
          <div>
            <h1 className={{styles.title}}>{{compData.name}}</h1>
            <p className={{styles.subtitle}}>Reference: {c_annex}</p>
          </div>
          <div>
            <Link href="/dashboard">
              <button className={{styles.btnSecondary}}>Back to Dashboard</button>
            </Link>
          </div>
        </div>
      </div>

      <div className={{styles.summaryCards}}>
        <div className={{styles.card}}>
          <div className={{styles.cardLabel}}>Approved Budget</div>
          <div className={{styles.cardValue}}>₹ {{compData.approvedBudget.toLocaleString('en-IN')}}</div>
        </div>
        <div className={{styles.card}}>
          <div className={{styles.cardLabel}}>Expenditure</div>
          <div className={{styles.cardValue}} style={{{{ color: 'var(--error)' }}}}>
            ₹ {{compData.expenditureIncurred.toLocaleString('en-IN')}}
          </div>
        </div>
        <div className={{styles.card}}>
          <div className={{styles.cardLabel}}>Balance</div>
          <div className={{styles.cardValue}} style={{{{ color: 'var(--success)' }}}}>
            ₹ {{compData.unutilizedBalance.toLocaleString('en-IN')}}
          </div>
        </div>
        <div className={{styles.card}}>
          <div className={{styles.cardLabel}}>Utilization</div>
          <div className={{styles.cardValue}}>{{compData.utilizationPercent}}%</div>
        </div>
      </div>

      <Component{c_no}Client budgetComponentId={{compData.id}} entries={{compData.annexure{c_roman}}} />
    </div>
  );
}}
"""
    with open(os.path.join(dir_path, "page.tsx"), "w", encoding="utf-8") as f:
        f.write(page_code)
        
    # 2. Generate ComponentXClient.tsx
    
    state_initial = "{" + ", ".join([f"{f['name']}: ''" for f in comp['fields']]) + "}"
    
    form_inputs = ""
    for f in comp['fields']:
        req = "required" if f['name'] in ['datePeriod', 'amount', 'remuneration', 'expertName', 'vendor', 'platform'] else ""
        form_inputs += f"""
          <div className={{styles.formGroup}}>
            <label>{f['label']}</label>
            <input type="{f['type']}" name="{f['name']}" value={{formData.{f['name']}}} onChange={{handleChange}} {req} />
          </div>"""
          
    total_calc = " + ".join([f"(Number(formData.{sf}) || 0)" for sf in comp['sumFields']])
    if c_no == 5:
        total_calc = f"(Number(formData.quantity) || 0) * (Number(formData.unitCost) || 0) + " + total_calc

    th_code = "".join([f"<th>{f['label']}</th>" for f in comp['fields'][:7]])
    td_code = "".join([f"<td>{{entry.{f['name']}}}</td>" for f in comp['fields'][:7]])

    client_code = f"""'use client';
import React, {{ useState }} from 'react';
import {{ addAnnexure{c_roman}Entry }} from '../actions';
import styles from '../budget.module.css';

export default function Component{c_no}Client({{ budgetComponentId, entries }}: {{ budgetComponentId: string, entries: any[] }}) {{
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({state_initial});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {{
    setFormData({{ ...formData, [e.target.name]: e.target.value }});
  }};

  const handleSubmit = async (e: React.FormEvent) => {{
    e.preventDefault();
    const dataToSubmit: any = {{ budgetComponentId }};
    Object.keys(formData).forEach(k => {{
      const numFields = ['quantity', {", ".join([f"'{sf}'" for sf in comp['sumFields']])}];
      dataToSubmit[k] = numFields.includes(k) ? Number((formData as any)[k]) || 0 : (formData as any)[k];
    }});
    
    await addAnnexure{c_roman}Entry(dataToSubmit);
    setIsAdding(false);
    setFormData({state_initial});
    alert("Transaction Added Successfully");
  }};

  return (
    <div>
      <div className={{styles.actionsBar}} style={{{{ marginTop: '24px' }}}}>
        <h3 className={{styles.title}} style={{{{ fontSize: '20px' }}}}>Expenditure Entries</h3>
        <button className={{styles.btnPrimary}} onClick={{() => setIsAdding(!isAdding)}}>
          {{isAdding ? 'Cancel' : '+ Add New Entry'}}
        </button>
      </div>

      {{isAdding && (
        <form className={{styles.formGrid}} onSubmit={{handleSubmit}}>
          {form_inputs}
          <div className={{styles.formGroup}}>
            <label>Total Expenditure (₹)</label>
            <input type="text" value={{{total_calc}}} disabled style={{{{ backgroundColor: '#e2e8f0', cursor: 'not-allowed' }}}} />
          </div>
          <div className={{styles.formActions}}>
            <button type="submit" className={{styles.btnPrimary}}>Save Entry</button>
          </div>
        </form>
      )}}

      <div className={{styles.tableContainer}}>
        <table className={{styles.dataTable}}>
          <thead>
            <tr>
              <th>Sl. No.</th>
              {th_code}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {{entries.length === 0 ? (
              <tr><td colSpan={{9}} style={{{{textAlign:'center'}}}}>No records found</td></tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={{entry.id}}>
                  <td>{{idx + 1}}</td>
                  {td_code}
                  <td style={{{{fontWeight: 'bold'}}}}>₹ {{entry.totalExpenditure.toLocaleString('en-IN')}}</td>
                </tr>
              ))
            )}}
          </tbody>
        </table>
      </div>
    </div>
  );
}}
"""
    with open(os.path.join(dir_path, f"Component{c_no}Client.tsx"), "w", encoding="utf-8") as f:
        f.write(client_code)

print("Generated successfully!")
