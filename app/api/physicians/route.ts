import {NextResponse} from "next/server";

export type Physician = {
  id: string;
  name: string;
  specialtyId: string;
  photoUrl: string | null;
  rating: number;
};

const PHYSICIANS: Physician[] = [
  {id: "phy-001", name: "Dr. Olena Kovalenko", specialtyId: "cardiology", photoUrl: null, rating: 4.9},
  {id: "phy-002", name: "Dr. Mykhailo Petrenko", specialtyId: "cardiology", photoUrl: null, rating: 4.7},
  {id: "phy-003", name: "Dr. Iryna Shevchenko", specialtyId: "dermatology", photoUrl: null, rating: 4.8},
  {id: "phy-004", name: "Dr. Vasyl Bondarenko", specialtyId: "endocrinology", photoUrl: null, rating: 4.6},
  {id: "phy-005", name: "Dr. Natalia Kravchenko", specialtyId: "gastroenterology", photoUrl: null, rating: 4.8},
  {id: "phy-006", name: "Dr. Andriy Melnyk", specialtyId: "general-practice", photoUrl: null, rating: 4.5},
  {id: "phy-007", name: "Dr. Oksana Moroz", specialtyId: "general-practice", photoUrl: null, rating: 4.7},
  {id: "phy-008", name: "Dr. Tetyana Kovalchuk", specialtyId: "gynecology", photoUrl: null, rating: 4.9},
  {id: "phy-009", name: "Dr. Serhiy Lysenko", specialtyId: "neurology", photoUrl: null, rating: 4.8},
  {id: "phy-010", name: "Dr. Halyna Tkachenko", specialtyId: "oncology", photoUrl: null, rating: 4.7},
  {id: "phy-011", name: "Dr. Roman Boyko", specialtyId: "ophthalmology", photoUrl: null, rating: 4.6},
  {id: "phy-012", name: "Dr. Larysa Kuzyk", specialtyId: "orthopedics", photoUrl: null, rating: 4.8},
  {id: "phy-013", name: "Dr. Pavlo Sydorenko", specialtyId: "pediatrics", photoUrl: null, rating: 4.9},
  {id: "phy-014", name: "Dr. Yulia Savchenko", specialtyId: "psychiatry", photoUrl: null, rating: 4.7},
  {id: "phy-015", name: "Dr. Ivan Tkach", specialtyId: "pulmonology", photoUrl: null, rating: 4.6},
  {id: "phy-016", name: "Dr. Dmytro Panchenko", specialtyId: "urology", photoUrl: null, rating: 4.8},
];

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const specialtyId = searchParams.get("specialty");

  const physicians = specialtyId
    ? PHYSICIANS.filter((p) => p.specialtyId === specialtyId)
    : PHYSICIANS;

  return NextResponse.json({physicians});
}
