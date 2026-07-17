with open("src/components/EmployeeBooking.tsx", "r") as f:
    text = f.read()

target = """            </div>
          )}
            </div>
          </div>
      </div>

      {/* Create New Room Modal */}"""

replacement = """            </div>
          )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Room Modal */}"""

with open("src/components/EmployeeBooking.tsx", "w") as f:
    f.write(text.replace(target, replacement))
