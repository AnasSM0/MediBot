import csv
import os

# Define dataset directory path
DATA_PATH = os.path.join(os.path.dirname(__file__), "datasets")

SYMPTOM_DESC_FILE = os.path.join(DATA_PATH, "symptom_Description.csv")
SYMPTOM_PRECAUTION_FILE = os.path.join(DATA_PATH, "symptom_precaution.csv")
SYMPTOM_SEVERITY_FILE = os.path.join(DATA_PATH, "symptom_severity.csv")
SYMPTOM_DATASET_FILE = os.path.join(DATA_PATH, "dataset.csv")
HOME_REMEDIES_FILE = os.path.join(DATA_PATH, "home_remedies.csv")


class MedicalLookup:
    def __init__(self):
        self.descriptions = self._load_symptom_descriptions()
        self.precautions = self._load_symptom_precautions()
        self.severity = self._load_symptom_severity()
        self.dataset = self._load_dataset()
        self.remedies = self._load_home_remedies()

    def _load_csv(self, filepath):
        """Safely load a CSV and return a list of dictionaries."""
        try:
            with open(filepath, encoding="utf-8") as f:
                return list(csv.DictReader(f))
        except FileNotFoundError:
            print(f"[Warning] Missing file: {os.path.basename(filepath)}")
            return []

    def _load_symptom_descriptions(self):
        data = self._load_csv(SYMPTOM_DESC_FILE)
        return {
            row["Disease"].strip().lower(): row["Description"].strip()
            for row in data if "Disease" in row and "Description" in row and row["Disease"]
        }

    def _load_symptom_precautions(self):
        data = self._load_csv(SYMPTOM_PRECAUTION_FILE)
        return {
            row["Disease"].strip().lower(): [
                v.strip() for k, v in row.items() if k.startswith("Precaution") and v.strip()
            ]
            for row in data if "Disease" in row and row["Disease"]
        }

    def _load_symptom_severity(self):
        data = self._load_csv(SYMPTOM_SEVERITY_FILE)
        severity_map = {}
        for row in data:
            if "Symptom" in row and "weight" in row and row["Symptom"]:
                try:
                    severity_map[row["Symptom"].strip().lower()] = float(row["weight"])
                except ValueError:
                    continue
        return severity_map

    def _load_dataset(self):
        """Load dataset with columns like Disease, Symptom_1 ... Symptom_17"""
        data = self._load_csv(SYMPTOM_DATASET_FILE)
        dataset = {}

        for row in data:
            disease = row.get("Disease", "").strip().lower()
            if not disease:
                continue

            # Collect all symptoms dynamically (Symptom_1 ... Symptom_17)
            symptoms = [
                v.strip().lower()
                for k, v in row.items()
                if k.lower().startswith("symptom") and v and v.strip()
            ]
            dataset[disease] = symptoms

        return dataset

    def _load_home_remedies(self):
        data = self._load_csv(HOME_REMEDIES_FILE)
        remedies = {}
        for row in data:
            issue = row.get("Health Issue", "").strip().lower()
            if not issue:
                continue
            remedies[issue] = {
                "remedy": row.get("Home Remedy", "").strip(),
                "yoga": row.get("Yogasan", "").strip(),
                "item": row.get("Name of Item", "").strip(),
            }
        return remedies

    def get_possible_diseases(self, user_symptoms):
        """Return a list of top 5 possible diseases based on symptom overlap."""
        matches = []
        user_symptoms = [s.lower().strip() for s in user_symptoms if s.strip()]

        for disease, symptoms in self.dataset.items():
            overlap = len(set(user_symptoms) & set(symptoms))
            if overlap > 0:
                matches.append((disease, overlap))

        matches.sort(key=lambda x: x[1], reverse=True)
        return [d for d, _ in matches[:5]]  # top 5 possible diseases

    def get_disease_info(self, disease):
        """Return disease description and precautions."""
        d = disease.lower().strip()
        return {
            "description": self.descriptions.get(d, "No description available."),
            "precautions": self.precautions.get(d, []),
        }

    def get_symptom_severity(self, symptoms):
        """Calculate average severity weight of given symptoms."""
        total_weight = sum(self.severity.get(s.lower().strip(), 0) for s in symptoms)
        avg_weight = total_weight / max(len(symptoms), 1)
        return avg_weight

    def get_home_remedy(self, issue):
        """Return home remedy, yoga, and item suggestions for a given issue."""
        issue = issue.lower().strip()
        return self.remedies.get(issue, None)
