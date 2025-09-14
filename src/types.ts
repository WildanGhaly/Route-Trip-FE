export type DutyStatus = 'off'|'sleeper'|'driving'|'on_duty'

export interface Segment { t0:string; t1:string; status:DutyStatus; label?:string }
export interface DayPlan { index:number; date:string; segments:Segment[]; notes:string }
export interface Stop { type:string; eta:string; duration_min:number }
export interface PlanTripResponse {
  route: { distance_mi:number; duration_hr:number; polyline:string|null }
  stops: Stop[]
  days: DayPlan[]
}

export interface PlanTripRequest {
  current_location:string
  pickup_location:string
  dropoff_location:string
  current_cycle_used_hours:number
  assume_distance_mi?:number
}