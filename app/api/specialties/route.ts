import {NextResponse} from "next/server";

export type Specialty = {
  id: string;
  label: string;
};

const SPECIALTIES: Specialty[] = [
  {id: "cardiology", label: "Cardiology"},
  {id: "dermatology", label: "Dermatology"},
  {id: "endocrinology", label: "Endocrinology"},
  {id: "gastroenterology", label: "Gastroenterology"},
  {id: "general-practice", label: "General Practice"},
  {id: "gynecology", label: "Gynecology"},
  {id: "neurology", label: "Neurology"},
  {id: "oncology", label: "Oncology"},
  {id: "ophthalmology", label: "Ophthalmology"},
  {id: "orthopedics", label: "Orthopedics"},
  {id: "pediatrics", label: "Pediatrics"},
  {id: "psychiatry", label: "Psychiatry"},
  {id: "pulmonology", label: "Pulmonology"},
  {id: "urology", label: "Urology"},
];

export async function GET() {
  return NextResponse.json({specialties: SPECIALTIES});
}
