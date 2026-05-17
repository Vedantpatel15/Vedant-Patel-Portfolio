# College Study Material Management System

This is a runnable local version of the ABAP project described in the report:

- Backend: Node.js HTTP API using the same core entities as the ABAP tables.
- Frontend: Fiori-style HTML, CSS, and JavaScript dashboard.
- Data: JSON seed data for users, departments, faculty, students, and study materials.

## Run The Project

```powershell
cd "C:\Users\vedan\Documents\New project\college-study-material-system"
node server.js
```

Open:

```text
http://localhost:3000
```

GitHub Pages demo URL after this repository is deployed:

```text
https://vedantpatel15.github.io/Vedant-Patel-Portfolio/college-study-material-system/
```

The local version uses the Node API in `server.js`. The GitHub Pages version runs in static demo mode because GitHub Pages cannot host a Node backend.

Demo users:

| Role | Email | Password |
| --- | --- | --- |
| Student | student@svit.edu.in | student123 |
| Faculty | faculty@svit.edu.in | faculty123 |
| Faculty/Admin | admin@svit.edu.in | admin123 |

## What Was Built

The local project maps your ABAP design to a working web app:

| ABAP/RAP entity | Local implementation |
| --- | --- |
| ZUSER_LOGIN | `/api/login`, hashed password seed data |
| ZSTUDY_MATERIAL | `/api/materials`, material cards, faculty create/delete |
| ZDEPARTMENT | `/api/departments`, dashboard summary and filters |
| ZFACULTY | `/api/faculty`, master data table |
| ZSTUDENT_1535 | `/api/students`, master data table and student defaults |

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service check |
| POST | `/api/login` | Role-based login |
| GET | `/api/dashboard` | Totals, department summary, recent materials |
| GET | `/api/materials` | Study material list with filters |
| POST | `/api/materials` | Create material metadata |
| DELETE | `/api/materials/:id` | Delete material |
| GET | `/api/departments` | Department master |
| GET | `/api/faculty` | Faculty master |
| GET | `/api/students` | Student master |

## Step-by-step SAP Fiori Completion Path

1. Finalize your ABAP RAP data model.
   Keep the five transparent tables from the report: `ZUSER_LOGIN`, `ZSTUDY_MATERIAL`, `ZDEPARTMENT`, `ZFACULTY`, and `ZSTUDENT_1535`.

2. Create or clean up CDS interface views.
   Use `ZR_` views for the database layer, for example `ZR_STUDY_MATERIAL000`, `ZR_DEPARTMENT`, `ZR_FACULTY`, and `ZR_STUDENT_1535`.

3. Create projection views.
   Use `ZC_` views for the UI/service layer, for example `ZC_STUDY_MATERIAL000` and `ZC_DEPARTMENT000`.

4. Add behavior definitions and implementations.
   Enable create, read, update, and delete for study materials. Keep student access read-focused and faculty access create/update-focused.

5. Add UI annotations.
   Add metadata extensions with `@UI.lineItem`, `@UI.identification`, `@UI.selectionField`, and `@UI.headerInfo` for clean Fiori Elements pages.

6. Expose the service.
   Use your OData V4 service definitions and bindings from the report:
   `ZUI_DEPARTMENT_O4`, `ZUI_FACULTY_O4`, `ZUI_STUDENT_1535_O4`, `ZUI_STUDY_MATERIAL000_O4`, and `ZUI_USER_LOGIN_O4`.

7. Preview with Fiori Elements.
   In ADT, open the service binding, publish it, then preview the exposed entity. Start with `ZC_STUDY_MATERIAL000`.

8. Build the frontend in SAP Business Application Studio.
   Create a SAP Fiori application from an OData service. Choose List Report/Object Page for quick delivery, or Freestyle SAPUI5 if you want a custom dashboard like this local version.

9. Connect the frontend to RAP OData.
   Replace this local Node API with your OData V4 service URLs. Map the frontend material fields to the CDS projection properties.

10. Implement file handling.
   For production, do not store only a local file path. Use either a media entity in RAP, SAP Document Management Service, or another approved content repository.

11. Add authorization.
   Use SAP roles/authorizations for student and faculty access instead of trusting a frontend role select.

12. Deploy.
   Deploy the Fiori app to SAP BTP HTML5 Application Repository or to the ABAP repository, depending on your landscape.

## Project Rating

Current ABAP project from the report: **7.5/10**.

Strong points:

- Clear academic use case.
- Good entity separation for users, students, faculty, departments, and materials.
- RAP/OData V4 direction is correct.
- Includes SQL concepts such as joins, aggregates, subqueries, and functions.

Main gaps to improve:

- Need a finished Fiori UI.
- Need real file upload/download handling.
- Need production-grade authentication and authorization.
- Need more validation, error handling, and test data.
- Need clearer UI annotations and end-to-end demo flow.

With the Fiori frontend, real media handling, and SAP role security added, this can become an **8.5/10 to 9/10** academic SAP project.
