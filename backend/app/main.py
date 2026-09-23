import re

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import auth, models, schemas
from .database import Base, SessionLocal, engine
from .auth import get_current_admin, get_current_faculty_or_admin, get_current_user


def initialize_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            admin = models.User(
                username="admin",
                email="admin@school.com",
                hashed_password=auth.get_password_hash("admin123"),
                role="admin",
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        department_count = db.query(models.Department).count()
        if department_count == 0:
            departments = [
                models.Department(name="Computer Science", code="CS"),
                models.Department(name="Information Technology", code="IT"),
                models.Department(name="Mechanical Engineering", code="ME"),
            ]
            db.add_all(departments)
            db.commit()

        if db.query(models.Course).count() == 0:
            cs_dept = db.query(models.Department).filter(models.Department.code == "CS").first()
            it_dept = db.query(models.Department).filter(models.Department.code == "IT").first()
            if cs_dept:
                db.add_all([
                    models.Course(code="CS101", title="Introduction to Programming", department_id=cs_dept.id),
                    models.Course(code="CS201", title="Data Structures", department_id=cs_dept.id),
                ])
            if it_dept:
                db.add_all([
                    models.Course(code="IT101", title="Web Technologies", department_id=it_dept.id),
                ])
            db.commit()
    finally:
        db.close()


def create_linked_user(db: Session, username_seed: str, email: str, role: str):
    username_base = re.sub(r"[^a-zA-Z0-9]+", "_", username_seed).strip("_").lower() or role
    username = f"{role}_{username_base}"
    suffix = 1
    while db.query(models.User).filter(models.User.username == username).first():
        suffix += 1
        username = f"{role}_{username_base}_{suffix}"

    account_email = email
    if db.query(models.User).filter(models.User.email == account_email).first():
        account_email = f"{role}_{username_base}_{suffix}@school.local"

    user = models.User(
        username=username,
        email=account_email,
        hashed_password=auth.get_password_hash("welcome123"),
        role=role,
    )
    db.add(user)
    db.flush()
    return user


initialize_database()

app = FastAPI(title="Student Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Student Management System API is running"}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(
        (models.User.username == payload.username) | (models.User.email == payload.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=auth.get_password_hash(payload.password),
        role=payload.role.lower(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered successfully", "user_id": user.id, "role": user.role}


@app.post("/api/auth/login")
def login_user(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = auth.create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "username": user.username, "role": user.role}}


@app.post("/api/auth/change-password")
def change_password(payload: schemas.PasswordChange, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not auth.verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")

    current_user.hashed_password = auth.get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@app.get("/api/me", response_model=schemas.UserSummary)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.get("/api/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    students = db.query(models.Student).all()
    faculty = db.query(models.Faculty).all()
    departments = db.query(models.Department).all()
    courses = db.query(models.Course).all()
    attendance = db.query(models.AttendanceRecord).order_by(models.AttendanceRecord.date.desc()).limit(10).all()
    marks = db.query(models.MarkEntry).order_by(models.MarkEntry.created_at.desc()).limit(10).all()

    return {
        "count_students": len(students),
        "count_faculty": len(faculty),
        "count_departments": len(departments),
        "count_courses": len(courses),
        "recent_attendance": [
            {
                "id": item.id,
                "student_id": item.student_id,
                "course_id": item.course_id,
                "date": item.date.isoformat(),
                "status": item.status,
                "notes": item.notes,
            }
            for item in attendance
        ],
        "recent_marks": [
            {
                "id": item.id,
                "student_id": item.student_id,
                "course_id": item.course_id,
                "exam_type": item.exam_type,
                "score": item.score,
                "total": item.total,
                "created_at": item.created_at.isoformat(),
            }
            for item in marks
        ],
        "students": [
            {
                "id": s.id,
                "name": s.name,
                "register_number": s.register_number,
                "email": s.email,
                "phone": s.phone,
                "department_id": s.department_id,
                "year": s.year,
                "section": s.section,
                "address": s.address,
                "user_id": s.user_id,
                "department": {"id": s.department.id, "name": s.department.name, "code": s.department.code} if s.department else None,
                "user": {"id": s.user.id, "username": s.user.username, "email": s.user.email, "role": s.user.role} if s.user else None,
            }
            for s in students
        ],
    }


@app.get("/api/departments")
def get_departments(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    departments = db.query(models.Department).all()
    return departments


@app.post("/api/departments", status_code=status.HTTP_201_CREATED)
def create_department(payload: schemas.DepartmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    department = models.Department(name=payload.name, code=payload.code)
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@app.get("/api/courses")
def get_courses(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Course).all()


@app.post("/api/courses", status_code=status.HTTP_201_CREATED)
def create_course(payload: schemas.CourseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    if not db.query(models.Department).filter(models.Department.id == payload.department_id).first():
        raise HTTPException(status_code=404, detail="Department not found")
    course = models.Course(code=payload.code, title=payload.title, department_id=payload.department_id)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@app.get("/api/students")
def get_students(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Student).all()


@app.post("/api/students", status_code=status.HTTP_201_CREATED)
def create_student(payload: schemas.StudentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    if not db.query(models.Department).filter(models.Department.id == payload.department_id).first():
        raise HTTPException(status_code=404, detail="Department not found")
    if payload.user_id and db.query(models.User).filter(models.User.id == payload.user_id).first() is None:
        raise HTTPException(status_code=404, detail="User not found")

    linked_user = db.query(models.User).filter(models.User.id == payload.user_id).first() if payload.user_id else None
    if payload.user_id and linked_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if linked_user is None:
        linked_user = create_linked_user(db, payload.register_number, payload.email, "student")

    student = models.Student(
        name=payload.name,
        register_number=payload.register_number,
        email=payload.email,
        phone=payload.phone,
        department_id=payload.department_id,
        year=payload.year,
        section=payload.section,
        address=payload.address,
        user_id=linked_user.id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return {"student": student, "account": {"username": linked_user.username, "temporary_password": "welcome123"}}


@app.delete("/api/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    linked_user = student.user
    db.query(models.AttendanceRecord).filter(models.AttendanceRecord.student_id == student.id).delete(synchronize_session=False)
    db.query(models.MarkEntry).filter(models.MarkEntry.student_id == student.id).delete(synchronize_session=False)
    db.delete(student)
    if linked_user:
        db.delete(linked_user)
    db.commit()
    return {"message": "Student and linked account deleted"}


@app.get("/api/faculty")
def get_faculty(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Faculty).all()


@app.post("/api/faculty", status_code=status.HTTP_201_CREATED)
def create_faculty(payload: schemas.FacultyCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    if not db.query(models.Department).filter(models.Department.id == payload.department_id).first():
        raise HTTPException(status_code=404, detail="Department not found")
    linked_user = db.query(models.User).filter(models.User.id == payload.user_id).first() if payload.user_id else None
    if payload.user_id and linked_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if linked_user is None:
        linked_user = create_linked_user(db, payload.name, f"{payload.name.replace(' ', '.').lower()}@school.local", "faculty")

    faculty_member = models.Faculty(
        name=payload.name,
        designation=payload.designation,
        department_id=payload.department_id,
        user_id=linked_user.id,
    )
    db.add(faculty_member)
    db.commit()
    db.refresh(faculty_member)
    return {"faculty": faculty_member, "account": {"username": linked_user.username, "temporary_password": "welcome123"}}


@app.delete("/api/faculty/{faculty_id}")
def delete_faculty(faculty_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_admin)):
    faculty_member = db.query(models.Faculty).filter(models.Faculty.id == faculty_id).first()
    if not faculty_member:
        raise HTTPException(status_code=404, detail="Faculty member not found")
    linked_user = faculty_member.user
    db.delete(faculty_member)
    if linked_user:
        db.delete(linked_user)
    db.commit()
    return {"message": "Faculty member and linked account deleted"}


@app.get("/api/attendance")
def get_attendance(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.AttendanceRecord).all()


@app.post("/api/attendance", status_code=status.HTTP_201_CREATED)
def create_attendance(payload: schemas.AttendanceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    if not db.query(models.Student).filter(models.Student.id == payload.student_id).first():
        raise HTTPException(status_code=404, detail="Student not found")
    if not db.query(models.Course).filter(models.Course.id == payload.course_id).first():
        raise HTTPException(status_code=404, detail="Course not found")
    attendance = models.AttendanceRecord(**payload.model_dump())
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


@app.get("/api/marks")
def get_marks(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.MarkEntry).all()


@app.post("/api/marks", status_code=status.HTTP_201_CREATED)
def create_mark(payload: schemas.MarkCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_faculty_or_admin)):
    if not db.query(models.Student).filter(models.Student.id == payload.student_id).first():
        raise HTTPException(status_code=404, detail="Student not found")
    if not db.query(models.Course).filter(models.Course.id == payload.course_id).first():
        raise HTTPException(status_code=404, detail="Course not found")
    mark = models.MarkEntry(**payload.model_dump())
    db.add(mark)
    db.commit()
    db.refresh(mark)
    return mark


@app.get("/api/search")
def search_records(
    q: str = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    students = db.query(models.Student).filter(
        (models.Student.name.ilike(f"%{q}%")) |
        (models.Student.register_number.ilike(f"%{q}%")) |
        (models.Student.email.ilike(f"%{q}%"))
    ).all()
    return {"students": students, "query": q}
