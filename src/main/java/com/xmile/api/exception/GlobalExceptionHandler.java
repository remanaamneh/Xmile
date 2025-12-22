package com.xmile.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, Object> response = new HashMap<>();
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        response.put("error", "Validation failed");
        response.put("message", "יש שגיאות באימות הנתונים");
        response.put("errors", errors);
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials(BadCredentialsException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("error", "Bad Request");
        response.put("message", ex.getMessage());
        return ResponseEntity.badRequest().body(response);
    } ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        Map<String, Object> error = new HashMap<>();
        String message = ex.getMessage();
        
        // Handle enum constant errors more gracefully
        if (message != null && message.contains("No enum constant")) {
            error.put("error", "Invalid enum value");
            error.put("message", "שגיאה בערך enum. אנא בדוק את הנתונים שנשלחו.");
            System.err.println("Enum error: " + message);
        } else {
            error.put("error", message != null ? message : "Invalid argument");
            error.put("message", message != null ? message : "שגיאה בנתונים");
        }
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(BadRequestException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("error", ex.getMessage());
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NotFoundException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        Map<String, Object> error = new HashMap<>();
        String message = ex.getMessage();
        
        // Log the full exception for debugging
        System.err.println("=== DATA INTEGRITY VIOLATION ===");
        System.err.println("Exception Type: " + ex.getClass().getName());
        System.err.println("Exception Message: " + message);
        if (ex.getCause() != null) {
            System.err.println("Cause: " + ex.getCause().getClass().getName() + " - " + ex.getCause().getMessage());
        }
        ex.printStackTrace(System.err);
        System.err.println("=== END ===");
        
        // Check for specific error patterns
        if (message != null) {
            if (message.contains("Data truncated for column")) {
                error.put("error", "Invalid data value");
                error.put("message", "הערך שנשלח לא תקין. ייתכן שהערך חורג מהגבולות המותרים או שהפורמט לא נכון.");
                error.put("details", message);
            } else if (message.contains("Duplicate entry")) {
                error.put("error", "Duplicate entry");
                error.put("message", "הרשומה כבר קיימת במערכת.");
            } else if (message.contains("foreign key constraint")) {
                error.put("error", "Foreign key constraint violation");
                error.put("message", "לא ניתן למחוק או לעדכן את הרשומה מכיוון שהיא קשורה לרשומות אחרות.");
            } else {
                error.put("error", "Data integrity violation");
                error.put("message", "שגיאה בשלמות הנתונים: " + message);
            }
        } else {
            error.put("error", "Data integrity violation");
            error.put("message", "שגיאה בשלמות הנתונים");
        }
        
        error.put("type", ex.getClass().getSimpleName());
        return ResponseEntity.badRequest().body(error);
    }
    
    @ExceptionHandler(java.sql.SQLException.class)
    public ResponseEntity<Map<String, Object>> handleSQLException(java.sql.SQLException ex) {
        Map<String, Object> error = new HashMap<>();
        String message = ex.getMessage();
        
        // Log the full exception for debugging
        System.err.println("=== SQL EXCEPTION ===");
        System.err.println("Exception Type: " + ex.getClass().getName());
        System.err.println("SQL State: " + ex.getSQLState());
        System.err.println("Error Code: " + ex.getErrorCode());
        System.err.println("Exception Message: " + message);
        ex.printStackTrace(System.err);
        System.err.println("=== END ===");
        
        // Check for specific SQL error patterns
        if (message != null) {
            if (message.contains("Data truncated for column")) {
                error.put("error", "Invalid data value");
                error.put("message", "הערך שנשלח לא תקין. ייתכן שהערך חורג מהגבולות המותרים או שהפורמט לא נכון.");
                error.put("details", message);
            } else if (message.contains("Duplicate entry")) {
                error.put("error", "Duplicate entry");
                error.put("message", "הרשומה כבר קיימת במערכת.");
            } else {
                error.put("error", "Database error");
                error.put("message", "שגיאה בבסיס הנתונים: " + message);
            }
        } else {
            error.put("error", "Database error");
            error.put("message", "שגיאה בבסיס הנתונים");
        }
        
        error.put("type", ex.getClass().getSimpleName());
        error.put("sqlState", ex.getSQLState());
        error.put("errorCode", ex.getErrorCode());
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex) {
        Map<String, Object> error = new HashMap<>();
        String message = ex.getMessage();
        error.put("error", "Runtime error");
        error.put("message", message != null ? message : "שגיאה בלתי צפויה");
        error.put("type", ex.getClass().getSimpleName());
        
        // Log full stack trace for debugging
        System.err.println("=== RUNTIME EXCEPTION ===");
        System.err.println("Message: " + message);
        System.err.println("Type: " + ex.getClass().getName());
        ex.printStackTrace(System.err);
        System.err.println("=== END RUNTIME EXCEPTION ===");
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        Map<String, Object> error = new HashMap<>();
        String path = ex.getResourcePath();
        
        // If it's an API path (/client/** or /admin/**), it should be handled by controllers
        // This means the controller might not be found or there's a routing issue
        if (path != null && (path.startsWith("/client/") || path.startsWith("/admin/"))) {
            error.put("error", "API endpoint not found");
            error.put("message", "הנקודת קצה לא נמצאה. אנא ודא שהשרת רץ עם כל ה-controllers.");
            error.put("path", path);
            error.put("type", "NoResourceFoundException");
            System.err.println("=== API ENDPOINT NOT FOUND ===");
            System.err.println("Path: " + path);
            System.err.println("This should be handled by a controller, not static resource handler");
            System.err.println("=== END ===");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
        
        // For other static resources, return 404
        error.put("error", "Resource not found");
        error.put("message", "המשאב המבוקש לא נמצא");
        error.put("path", path);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        Map<String, Object> error = new HashMap<>();
        // Log the full exception for debugging
        System.err.println("=== EXCEPTION DETAILS ===");
        System.err.println("Exception Type: " + ex.getClass().getName());
        System.err.println("Exception Message: " + ex.getMessage());
        if (ex.getCause() != null) {
            System.err.println("Cause: " + ex.getCause().getClass().getName() + " - " + ex.getCause().getMessage());
        }
        ex.printStackTrace();
        System.err.println("=== END EXCEPTION ===");
        
        // Return the actual error message for better debugging
        String errorMessage = ex.getMessage();
        if (errorMessage == null || errorMessage.isEmpty()) {
            errorMessage = ex.getClass().getSimpleName() + " occurred";
        }
        
        // Include cause if available
        if (ex.getCause() != null) {
            error.put("cause", ex.getCause().getMessage());
            error.put("causeType", ex.getCause().getClass().getSimpleName());
        }
        
        error.put("error", errorMessage);
        error.put("type", ex.getClass().getSimpleName());
        
        // Create a more descriptive message
        String userMessage = errorMessage;
        if (ex.getCause() != null && ex.getCause().getMessage() != null) {
            userMessage = errorMessage + " (" + ex.getCause().getMessage() + ")";
        }
        error.put("message", userMessage);
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}

