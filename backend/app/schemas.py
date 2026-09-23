from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "student"


class UserLogin(BaseModel):
    username: str
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str


class UserSummary(BaseModel):
    id: int
    username: str
    email: str
    role: str

    class Config:
        from_attributes = True


class DepartmentCreate(BaseModel):
    name: str
    code: str


class DepartmentOut(DepartmentCreate):
    id: int

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    code: str
    title: str
    department_id: int


class CourseOut(CourseCreate):
    id: int

    class Config:
        from_attributes = True


class StudentCreate(BaseModel):
    name: str
    register_number: str
    email: str
    phone: Optional[str] = None
    department_id: int
    year: int
    section: str = "A"
    address: Optional[str] = None
    user_id: Optional[int] = None


class StudentOut(StudentCreate):
    id: int
    department: Optional[DepartmentOut] = None
    user: Optional[UserSummary] = None

    class Config:
        from_attributes = True


class FacultyCreate(BaseModel):
    name: str
    designation: str
    department_id: int
    user_id: Optional[int] = None


class FacultyOut(FacultyCreate):
    id: int
    department: Optional[DepartmentOut] = None
    user: Optional[UserSummary] = None

    class Config:
        from_attributes = True


class AttendanceCreate(BaseModel):
    student_id: int
    course_id: int
    date: date
    status: str
    notes: Optional[str] = None


class AttendanceOut(AttendanceCreate):
    id: int

    class Config:
        from_attributes = True


class MarkCreate(BaseModel):
    student_id: int
    course_id: int
    exam_type: str
    score: float
    total: float = 100.0


class MarkOut(MarkCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardData(BaseModel):
    count_students: int
    count_faculty: int
    count_departments: int
    count_courses: int
    recent_attendance: list[AttendanceOut]
    recent_marks: list[MarkOut]
    students: list[StudentOut]
