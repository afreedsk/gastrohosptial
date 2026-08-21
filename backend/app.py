import os
import traceback
from datetime import timedelta
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config

from routes.auth import auth_bp
from routes.patients import patients_bp
from routes.appointments import appointments_bp
from routes.dashboard import dashboard_bp
from routes.op_billing import op_billing_bp
from routes.ip_billing import ip_billing_bp
from routes.admissions import admissions_bp
from routes.billing_management import billing_mgmt_bp
from routes.reports import reports_bp
from routes.users import users_bp
from routes.doctors import doctors_bp
from routes.departments import departments_bp
from routes.referral_doctors import referral_doctors_bp
from routes.op_registrations import op_reg_bp
from routes.ip_registrations import ip_reg_bp
from routes.patient_records import patient_records_bp
from routes.room_occupancy import room_occupancy_bp
from routes.direct_services import direct_services_bp
from routes.catalog import catalog_bp
from routes.pharmacy_items import pharmacy_items_bp
from routes.pharmacy_sales import pharmacy_sales_bp
from routes.patient_indents import patient_indents_bp
from routes.ot_indents import ot_indents_bp
from routes.advance_payments import advance_payments_bp

DEBUG = os.getenv("FLASK_ENV", "development") == "development"


def create_app():
    app = Flask(__name__)
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
    app.config["DEBUG"] = DEBUG
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    JWTManager(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(patients_bp, url_prefix="/api/patients")
    app.register_blueprint(appointments_bp, url_prefix="/api/appointments")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(op_billing_bp, url_prefix="/api/op-billing")
    app.register_blueprint(ip_billing_bp, url_prefix="/api/ip-billing")
    app.register_blueprint(admissions_bp, url_prefix="/api/admissions")
    app.register_blueprint(billing_mgmt_bp, url_prefix="/api/billing-management")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(doctors_bp, url_prefix="/api/doctors")
    app.register_blueprint(departments_bp, url_prefix="/api/departments")
    app.register_blueprint(referral_doctors_bp, url_prefix="/api/referral-doctors")
    app.register_blueprint(op_reg_bp, url_prefix="/api/op-registrations")
    app.register_blueprint(ip_reg_bp, url_prefix="/api/ip-registrations")
    app.register_blueprint(patient_records_bp, url_prefix="/api/patient-records")
    app.register_blueprint(room_occupancy_bp, url_prefix="/api/room-occupancy")
    app.register_blueprint(direct_services_bp, url_prefix="/api/direct-services")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(pharmacy_items_bp, url_prefix="/api/pharmacy-items")
    app.register_blueprint(catalog_bp, url_prefix="/api/catalog")
    app.register_blueprint(pharmacy_sales_bp, url_prefix="/api/pharmacy-sales")
    app.register_blueprint(patient_indents_bp, url_prefix="/api/patient-indents")
    app.register_blueprint(ot_indents_bp, url_prefix="/api/ot-indents")
    app.register_blueprint(advance_payments_bp, url_prefix="/api/advance-payments")
    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        # Prints the full traceback to the terminal running `python app.py`
        # so the real cause of a 500 is always visible, not just "Internal Server Error".
        traceback.print_exc()
        original = getattr(e, "original_exception", e)
        return jsonify({"error": "Internal server error", "detail": str(original)}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=DEBUG, port=5000)