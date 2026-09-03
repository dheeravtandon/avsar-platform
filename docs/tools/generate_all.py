"""Regenerate every binary document in docs/ from committed source.

    python docs/tools/generate_all.py

Documents and the data behind them cannot diverge: to change a requirement, a
risk, a register row or a compliance verdict, edit the source module here and
regenerate. A stale spreadsheet cannot be circulated by accident.

Requires: openpyxl, python-docx
"""

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DOCS = HERE.parent
sys.path.insert(0, str(HERE))

from common import VERSION  # noqa: E402

import gen_charter  # noqa: E402
import gen_code_register  # noqa: E402
import gen_dpdp  # noqa: E402
import gen_pmp  # noqa: E402
import gen_retention  # noqa: E402
import gen_risk_timeline  # noqa: E402
import gen_rtm  # noqa: E402
import gen_sdd  # noqa: E402

V = VERSION

TARGETS = [
    ("AVSAR-CHR-002", f"AVSAR_Project_Charter_v{V}.docx", gen_charter.build),
    ("AVSAR-PMP-003", f"AVSAR_Project_Management_Plan_v{V}.docx", gen_pmp.build),
    ("AVSAR-RTM-004", f"AVSAR_RTM_v{V}.xlsx", gen_rtm.build),
    ("AVSAR-SDD-005", f"AVSAR_Design_Document_v{V}.docx", gen_sdd.build),
    ("AVSAR-CDR-006", f"AVSAR_Code_Register_v{V}.xlsx", gen_code_register.build),
    ("AVSAR-RSK-007", f"AVSAR_Risk_Register_v{V}.xlsx", gen_risk_timeline.build_risk),
    ("AVSAR-TML-008", f"AVSAR_Project_Timeline_v{V}.xlsx", gen_risk_timeline.build_timeline),
    ("AVSAR-DPD-009", f"AVSAR_DPDP_Compliance_Tracker_v{V}.xlsx", gen_dpdp.build),
    ("AVSAR-RET-010", f"AVSAR_Data_Retention_Policy_v{V}.docx", gen_retention.build),
]


def main():
    failures = []
    print(f"\nGenerating the AVSAR document set into {DOCS}\n")
    for doc_id, filename, builder in TARGETS:
        target = DOCS / filename
        try:
            builder(str(target))
            size = target.stat().st_size / 1024
            print(f"  ok    {doc_id}  {filename}  ({size:.0f} kB)")
        except Exception as err:  # noqa: BLE001 - report and continue
            failures.append((doc_id, err))
            print(f"  FAIL  {doc_id}  {filename}\n        {type(err).__name__}: {err}")

    print(f"\n{len(TARGETS) - len(failures)} of {len(TARGETS)} documents generated.")
    print("Document 1 of the set is README.md at the repository root; document 11 is "
          "docs/SIH_QA_BRIEF.md.\n")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
