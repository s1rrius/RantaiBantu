import json
import models

def evaluate_contract(db, transaction: models.Transaction) -> bool:
    """
    Evaluates if a transaction meets its contract conditions.
    Returns True if the transaction should be confirmed.
    """
    contract = transaction.contract
    if not contract:
        # Mandatory contract logic: fail if no contract is attached
        return False

    try:
        params = json.loads(contract.params)
    except:
        params = {}

    if contract.contract_type == "governance":
        return evaluate_governance(transaction, params)
    
    # Fallback to simple count
    return len(transaction.signatures) >= transaction.required_validators

def evaluate_governance(transaction: models.Transaction, params: dict) -> bool:
    """
    Requires both Government and the recipient Town Representative to sign.
    """
    government_signed = False
    town_rep_signed = False

    for sig in transaction.signatures:
        if sig.validator.role == models.RoleEnum.government:
            government_signed = True
        if sig.validator.role == models.RoleEnum.town_representative:
            # Check if it's the rep for the specific town
            if sig.validator.town_id == transaction.to_town_id:
                town_rep_signed = True

    return government_signed and town_rep_signed
