package com.tripnote.common

import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(ApiException::class)
    fun handle(exception: ApiException): ResponseEntity<ProblemDetail> {
        val problem = ProblemDetail.forStatusAndDetail(exception.status, exception.message)
        exception.body?.let { problem.setProperty("current", it) }
        val builder = ResponseEntity.status(exception.status)
        exception.retryAfter?.let { builder.header(HttpHeaders.RETRY_AFTER, it.toSeconds().toString()) }
        return builder.body(problem)
    }

    @ExceptionHandler(MethodArgumentNotValidException::class, HttpMessageNotReadableException::class)
    fun invalid(exception: Exception): ProblemDetail {
        val problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "입력값을 확인해 주세요.")
        if (exception is MethodArgumentNotValidException) {
            problem.setProperty("fields", exception.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "") })
        }
        return problem
    }
}
